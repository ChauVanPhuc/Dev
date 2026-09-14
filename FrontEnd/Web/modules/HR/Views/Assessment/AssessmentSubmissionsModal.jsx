import React, { useState, useEffect } from 'react';
import { 
  X, Award, Eye, Calendar, Clock, Search, Filter, 
  Download, Users, TrendingUp, CheckCircle, AlertCircle 
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import AssessmentSubmissionDetailModal from './AssessmentSubmissionDetailModal';
import './assessment.css';

const AssessmentSubmissionsModal = ({ assessment, onClose }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('all');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const fetchSubmissions = () => {
    setLoading(true);
    const url = assessment?.id 
      ? `/hr/assessments/${assessment.id}/submissions` 
      : `/hr/assessments/submissions/all`;
      
    api.get(url, {
      params: {
        search: searchTerm || undefined,
        rank_level: rankFilter !== 'all' ? rankFilter : undefined
      }
    })
      .then(res => setSubmissions(Array.isArray(res) ? res : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assessment, rankFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubmissions();
  };

  const handleExportExcel = () => {
    const url = assessment?.id 
      ? `/hr/assessments/${assessment.id}/submissions/export` 
      : `/hr/assessments/submissions/export`;
    window.open(`${api.defaults.baseURL || ''}${url}`, '_blank');
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
  const totalCount = submissions.length;
  const avgScore = totalCount > 0 
    ? Math.round(submissions.reduce((acc, cur) => acc + (cur.percentage || 0), 0) / totalCount) 
    : 0;
  const passedCount = submissions.filter(s => (s.percentage || 0) >= (assessment?.pass_percentage || 60)).length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="assessment-modal-overlay" onClick={onClose}>
      <div 
        className="assessment-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '960px',
          maxHeight: '90vh',
          background: '#ffffff',
          border: '1px solid #e7dfd5',
          color: '#1c1917',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e7dfd5', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1c1917', margin: '0 0 3px 0' }}>
              Lịch Sử Làm Bài - {assessment?.title || 'Tất cả bài thi'}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#78716c', margin: 0 }}>
              Quản lý danh sách kết quả bài thi và xem lại chi tiết bài làm của nhân sự
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Xuất bảng kết quả ra file Excel"
            >
              <Download size={14} /> Xuất Excel
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

        {/* Top KPI Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '600' }}>Tổng lượt thi</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1c1917' }}>{totalCount}</div>
          </div>
          <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '600' }}>Điểm trung bình</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#d97706' }}>{avgScore}%</div>
          </div>
          <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '600' }}>Tỷ lệ Đạt yêu cầu</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>{passRate}% <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#78716c' }}>({passedCount} bài)</span></div>
          </div>
          <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '600' }}>Cấp độ đạt chuẩn</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#92400e', marginTop: '2px' }}>
              Level A - C ({submissions.filter(s => ['Level A', 'Level B', 'Level C'].includes(s.rank_level)).length})
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} color="#78716c" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên nhân sự, mã NV, phòng ban, vị trí..."
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
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#1c1917',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Tìm
            </button>
          </form>

          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
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
            <option value="all">Tất cả xếp loại</option>
            <option value="Level A">Level A (Xuất sắc)</option>
            <option value="Level B">Level B (Khá giỏi)</option>
            <option value="Level C">Level C (Đạt)</option>
            <option value="Level D">Level D (Cần cải thiện)</option>
            <option value="Level F">Level F (Kém / Chưa đạt)</option>
          </select>
        </div>

        {/* Submissions Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#78716c' }}>Đang tải danh sách kết quả...</div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#78716c' }}>
              Chưa có nhân sự nào thực hiện bài kiểm tra này theo bộ lọc.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e7dfd5', color: '#78350f', textAlign: 'left', background: '#faf9f6', position: 'sticky', top: 0, zIndex: 1 }}>
                  <th style={{ padding: '10px 12px', borderRadius: '8px 0 0 8px' }}>Nhân sự</th>
                  {!assessment?.id && <th style={{ padding: '10px 12px' }}>Đợt thi</th>}
                  <th style={{ padding: '10px 12px' }}>Vị trí & Bộ phận</th>
                  <th style={{ padding: '10px 12px' }}>Điểm số</th>
                  <th style={{ padding: '10px 12px' }}>Xếp loại Level</th>
                  <th style={{ padding: '10px 12px' }}>Thời gian nộp</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const badge = getRankBadgeColor(s.rank_level);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f0ece6' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#1c1917' }}>
                        {s.candidate_name}
                        {s.employee_code && <span style={{ fontSize: '11px', color: '#78716c', display: 'block', fontWeight: 'normal' }}>Mã: {s.employee_code}</span>}
                      </td>
                      {!assessment?.id && (
                        <td style={{ padding: '12px', color: '#57534e', fontSize: '12px', fontWeight: '600' }}>
                          {s.assessment_title}
                        </td>
                      )}
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
                          onClick={() => setSelectedSubmissionId(s.id)}
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
                          title="Xem chi tiết từng câu hỏi thí sinh đã làm"
                        >
                          <Eye size={13} /> Xem bài làm
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal chi tiết câu hỏi bài làm */}
        {selectedSubmissionId && (
          <AssessmentSubmissionDetailModal
            submissionId={selectedSubmissionId}
            onClose={() => setSelectedSubmissionId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentSubmissionsModal;
