import React, { useState } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, AlertTriangle, Download, 
  ArrowRight, ArrowLeft, Check, HelpCircle, FileSpreadsheet, Eye, Sparkles
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import './assessment.css';

const DEFAULT_SAMPLE_MD = `# Tiêu đề: Đánh giá chuyên môn QA/QC Mới
- Thời gian: 45
- Danh mục: Quản lý chất lượng
- Vị trí áp dụng: QA, QC, KCS, Tổ trưởng
- Tỷ lệ đạt: 60
- Xáo trộn câu hỏi: true
- Xáo trộn đáp án: true
- Mô tả: Bộ câu hỏi kiểm tra năng lực tiêu chuẩn CARB Phase 2, FSC, ISO và quy trình SOP.

---
### Câu 1: Tiêu chuẩn CARB Phase 2 quy định mức phát thải Formaldehyde tối đa đối với ván ép HWPW là bao nhiêu?
- [x] A. 0.05 ppm
- [ ] B. 0.08 ppm
- [ ] C. 0.11 ppm
- [ ] D. 0.13 ppm
* Điểm: 2.0
* Chủ đề: Tiêu chuẩn CARB
* Giải thích: CARB Phase 2 là tiêu chuẩn kiểm soát khí thải formaldehyde của California & Hoa Kỳ.

---
### Câu 2: Khi phát hiện lỗi nghiêm trọng tại chuyền, hành động đầu tiên là gì?
- [x] A. Dừng chuyền, gắn thẻ cách ly và báo cho Tổ trưởng & QA
- [ ] B. Tiếp tục làm và ghi sổ cuối ca
- [ ] C. Tự ý sửa mà không ghi chép
* Điểm: 2.0
* Chủ đề: Quy trình SOP
`;

const AssessmentImportModal = ({ onClose, onSuccess, targetAssessmentId, targetAssessmentTitle }) => {
  const [step, setStep] = useState(1); // 1: Select/Input, 2: Preview & Validation
  const [tab, setTab] = useState('excel'); // 'excel' | 'md_file' | 'paste'
  const [selectedFile, setSelectedFile] = useState(null);
  const [mdContent, setMdContent] = useState(DEFAULT_SAMPLE_MD);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Preview data
  const [previewData, setPreviewData] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      const res = await api.get('/hr/assessments/template/excel', { responseType: 'blob' });
      const blob = new Blob([res?.data || res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_De_Thi_Danh_Gia.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
      window.open(`${base}/hr/assessments/template/excel`, '_blank');
    }
  };

  const handleDownloadMarkdownTemplate = async () => {
    try {
      const res = await api.get('/hr/assessments/template/markdown', { responseType: 'blob' });
      const blob = new Blob([res?.data || res], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_De_Thi_Danh_Gia.md');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
      window.open(`${base}/hr/assessments/template/markdown`, '_blank');
    }
  };

  // Step 1 -> Step 2: Call preview API
  const handleProceedPreview = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      if (tab === 'paste') {
        if (!mdContent.trim()) {
          setErrorMsg('Vui lòng nhập nội dung Markdown đề thi.');
          setLoading(false);
          return;
        }
        formData.append('content', mdContent);
      } else {
        if (!selectedFile) {
          setErrorMsg('Vui lòng chọn file Excel hoặc Markdown để tải lên.');
          setLoading(false);
          return;
        }
        formData.append('file', selectedFile);
      }

      const res = await api.post('/hr/assessments/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!res.questions || res.questions.length === 0) {
        setErrorMsg('Không thể bóc tách câu hỏi nào từ nội dung được cung cấp. Vui lòng kiểm tra định dạng file.');
        setLoading(false);
        return;
      }

      setPreviewData(res);
      setStep(2);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi phân tích dữ liệu đề thi. Vui lòng kiểm tra lại cấu trúc file.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm import to database
  const handleConfirmImport = async () => {
    if (!previewData) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (targetAssessmentId) {
        // Bổ sung câu hỏi vào đề hiện tại
        await api.post(`/hr/assessments/${targetAssessmentId}/questions/append`, {
          questions: previewData.questions
        });
      } else {
        // Tạo đề thi mới
        await api.post('/hr/assessments/import/confirm', previewData);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi lưu đề thi vào hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const isAppendMode = Boolean(targetAssessmentId);

  return (
    <div className="assessment-modal-overlay" onClick={onClose}>
      <div 
        className="assessment-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: step === 1 ? '720px' : '900px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e7dfd5', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1c1917', margin: '0 0 3px 0' }}>
              {isAppendMode ? `Import Bổ Sung Câu Hỏi - ${targetAssessmentTitle}` : 'Import Đề Thi & Ngân Hàng Câu Hỏi'}
            </h2>
            <p style={{ fontSize: '12.5px', color: '#78716c', margin: 0 }}>
              {step === 1 ? 'Bước 1: Chọn nguồn dữ liệu Excel (.xlsx) hoặc Markdown (.md)' : 'Bước 2: Xem trước & Xác thực dữ liệu trước khi lưu'}
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

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12.5px',
            marginBottom: '14px'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CHỌN NGUỒN DỮ LIỆU */}
        {step === 1 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Template Download Bar */}
            <div style={{
              background: '#fdfbf7',
              border: '1px solid #ebdccb',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '12.5px', color: '#78350f', fontWeight: '600' }}>
                💡 Chưa có file định dạng chuẩn? Tải mẫu tại đây:
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={13} /> Mẫu Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdownTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={13} /> Mẫu Markdown (.md)
                </button>
              </div>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setTab('excel'); setSelectedFile(null); }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: tab === 'excel' ? '1.5px solid #059669' : '1px solid #e7dfd5',
                  background: tab === 'excel' ? '#ecfdf5' : '#faf9f6',
                  color: tab === 'excel' ? '#059669' : '#57534e',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={15} /> 📁 File Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => { setTab('md_file'); setSelectedFile(null); }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: tab === 'md_file' ? '1.5px solid #d97706' : '1px solid #e7dfd5',
                  background: tab === 'md_file' ? '#fef3c7' : '#faf9f6',
                  color: tab === 'md_file' ? '#92400e' : '#57534e',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={15} /> 📄 File Markdown (.md)
              </button>
              <button
                type="button"
                onClick={() => { setTab('paste'); setSelectedFile(null); }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: tab === 'paste' ? '1.5px solid #d97706' : '1px solid #e7dfd5',
                  background: tab === 'paste' ? '#fef3c7' : '#faf9f6',
                  color: tab === 'paste' ? '#92400e' : '#57534e',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                ✍️ Dán nội dung Markdown
              </button>
            </div>

            {/* Tab content */}
            {tab === 'excel' ? (
              <div style={{
                border: '2px dashed #a7f3d0',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f0fdf4'
              }}>
                <FileSpreadsheet size={40} color="#059669" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', margin: '0 0 4px 0' }}>
                  {selectedFile ? selectedFile.name : 'Chọn hoặc kéo thả file Excel (.xlsx) vào đây'}
                </p>
                <p style={{ fontSize: '12px', color: '#047857', margin: '0 0 14px 0' }}>
                  Tự động đọc thông tin đề thi và ngân hàng câu hỏi trắc nghiệm / tự luận
                </p>
                <label style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>
                  Chọn file Excel từ máy
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>
            ) : tab === 'md_file' ? (
              <div style={{
                border: '2px dashed #d6d3d1',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                background: '#faf9f6'
              }}>
                <Upload size={40} color="#d97706" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#1c1917', margin: '0 0 4px 0' }}>
                  {selectedFile ? selectedFile.name : 'Chọn hoặc kéo thả file Markdown (.md, .txt) vào đây'}
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', margin: '0 0 14px 0' }}>
                  Hỗ trợ định dạng cú pháp Markdown tiêu chuẩn
                </p>
                <label style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}>
                  Chọn file .md từ máy
                  <input type="file" accept=".md,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <div>
                <textarea
                  rows={11}
                  value={mdContent}
                  onChange={(e) => setMdContent(e.target.value)}
                  placeholder="Dán nội dung markdown theo đúng cấu trúc..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#faf9f6',
                    border: '1px solid #e7dfd5',
                    borderRadius: '10px',
                    color: '#1c1917',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: XEM TRƯỚC VÀ XÁC THỰC (PREVIEW) */}
        {step === 2 && previewData && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Metadata Summary Box */}
            <div style={{
              background: '#fdfbf7',
              border: '1px solid #ebdccb',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1c1917', margin: '0 0 4px 0' }}>
                    {previewData.metadata?.title || 'Bài kiểm tra năng lực'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#78716c' }}>
                    {previewData.metadata?.description || 'Không có mô tả.'}
                  </div>
                </div>

                <span style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0'
                }}>
                  {previewData.total_questions} câu hỏi
                </span>
              </div>

              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#57534e', flexWrap: 'wrap' }}>
                <span>⏱️ Thời gian: <b>{previewData.metadata?.duration_minutes || 45} phút</b></span>
                <span>🎯 Danh mục: <b>{previewData.metadata?.category || 'Quản lý chất lượng'}</b></span>
                <span>🏆 Tỷ lệ đạt: <b>{previewData.metadata?.pass_percentage || 60}%</b></span>
                {previewData.metadata?.target_positions && (
                  <span>👥 Vị trí: <b>{previewData.metadata.target_positions.join(', ')}</b></span>
                )}
              </div>
            </div>

            {/* Warnings Alert if any */}
            {previewData.warnings && previewData.warnings.length > 0 && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} /> Lưu ý & Cảnh báo khi bóc tách ({previewData.warnings.length}):
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350f' }}>
                  {previewData.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions Preview List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#1c1917' }}>
                Danh sách {previewData.questions.length} câu hỏi bóc tách được:
              </div>

              {previewData.questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#faf9f6',
                    border: '1px solid #e7dfd5',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '800', fontSize: '12.5px', color: '#b45309' }}>
                      Câu {idx + 1} {q.category_tag && `• [${q.category_tag}]`} {q.question_type === 'essay' && `• [Tự luận]`}
                    </span>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#059669' }}>
                      {q.points} điểm
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1c1917', marginBottom: '8px' }}>
                    {q.question_text}
                  </div>

                  {q.question_type === 'essay' ? (
                    <div style={{ fontSize: '12px', color: '#57534e', fontStyle: 'italic', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7dfd5' }}>
                      📝 Tiêu chí tự luận: {q.explanation || 'Chấm theo rubric'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {q.options?.map((opt) => {
                        const isCorrect = (q.correct_answers || []).includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              background: isCorrect ? '#ecfdf5' : '#ffffff',
                              border: isCorrect ? '1px solid #10b981' : '1px solid #e7dfd5',
                              color: isCorrect ? '#059669' : '#44403c',
                              fontWeight: isCorrect ? '700' : 'normal',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isCorrect && <CheckCircle2 size={13} color="#059669" />}
                            <span><b>{opt.id}.</b> {opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e7dfd5', paddingTop: '14px', marginTop: '16px' }}>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#faf9f6',
                border: '1px solid #d6d3d1',
                color: '#44403c',
                fontWeight: '700',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Quay lại sửa
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#f5f5f4',
                border: '1px solid #d6d3d1',
                color: '#44403c',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>

            {step === 1 ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleProceedPreview}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                }}
              >
                <Eye size={14} /> {loading ? 'Đang phân tích...' : 'Tiếp tục: Xem trước'}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmImport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 26px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
              >
                <Check size={15} /> {loading ? 'Đang lưu đề thi...' : (isAppendMode ? 'Bổ sung vào đề thi' : 'Hoàn tất Import')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentImportModal;
