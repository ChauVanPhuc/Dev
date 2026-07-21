import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import { Camera, X, Image as ImageIcon, RotateCcw, Search, ChevronDown, ChevronUp, Check, AlertCircle, Plus } from 'lucide-react';
import apiClient, { API_ROOT } from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import InspectionDetailPopup, { formatDateTime } from './components/InspectionDetailPopup';

const MockupToggle = ({ value, onChange, disabled }) => {
  const isPass = value === 'pass';
  return (
    <div
      onClick={() => !disabled && onChange(isPass ? 'fail' : 'pass')}
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: isPass ? '#5d3b32' : '#e2e8f0',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        display: 'inline-block',
        border: '1px solid #cbd5e1',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          position: 'absolute',
          top: '2px',
          left: isPass ? '24px' : '2px',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

const StageProcessView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const inspectionType = 'quy-trinh';

  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [selectedStepId, setSelectedStepId] = useState('');
  const [processDetails, setProcessDetails] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_ROOT}${path.startsWith('/') ? path.substring(1) : path}`;
  };

  // Form states
  const [stepData, setStepData] = useState({}); // { step_id: { result: 'pass', value: '', photo: '' } }
  const [overallConclusion, setOverallConclusion] = useState('pass');
  const [notes, setNotes] = useState('');
  const [generalEvidence, setGeneralEvidence] = useState([]);

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessLoading, setIsProcessLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Modals
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);
  const [isoActiveTab, setIsoActiveTab] = useState('quick'); // 'quick' | 'detail'

  const [activeStepIdForPhoto, setActiveStepIdForPhoto] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Load processes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/iso-documents/processes');
        if (res.data) setProcesses(res.data);
      } catch (err) {
        console.error("Lỗi tải danh sách ISO:", err);
      }
    };
    fetchData();
    fetchHistory();
  }, []);

  // Fetch history
  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await apiClient.get('/inspections/stage?limit=20');
      if (res.data) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const filteredHistory = historyList.filter(item => item.inspection_type === 'quy-trinh').slice(0, 5);

  // Fetch process details when selected
  useEffect(() => {
    if (!selectedProcessId) {
      setProcessDetails(null);
      setStepData({});
      return;
    }
    const fetchDetails = async () => {
      setIsProcessLoading(true);
      try {
        const res = await apiClient.get(`/iso-documents/processes/${selectedProcessId}/details`);
        if (res.data) {
          setProcessDetails(res.data);
          let workInstructions = [];
          if (res.data.sections && res.data.sections['__metadata_work_instructions__']) {
            try {
              workInstructions = JSON.parse(res.data.sections['__metadata_work_instructions__']);
            } catch (e) { }
          }

          const initialData = {};
          workInstructions.forEach(inst => {
            (inst.steps || []).forEach(item => {
              const itemId = item.id || `item_${item.id}`;
              initialData[itemId] = { result: 'pass', value: '', photo: '' };
            });
          });

          // Fallback if no metadata
          if (workInstructions.length === 0 && res.data.steps) {
            (res.data.steps || []).forEach(step => {
              (step.checklist || []).forEach(item => {
                const itemId = item.id || `item_${item.id}`;
                initialData[itemId] = { result: 'pass', value: '', photo: '' };
              });
            });
          }

          setStepData(initialData);
        }
      } catch (err) {
        console.error("Lỗi tải chi tiết quy trình:", err);
      } finally {
        setIsProcessLoading(false);
      }
    };
    fetchDetails();
  }, [selectedProcessId]);

  const updateStepData = (itemId, field, value) => {
    setStepData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { result: 'pass', value: '', photo: '' },
        [field]: value
      }
    }));
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('files', file); // API expects 'files' list

    try {
      const res = await apiClient.post('/inspections/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.paths && res.data.paths.length > 0) {
        const fileUrl = res.data.paths[0];
        if (activeStepIdForPhoto === 'general') {
          setGeneralEvidence(prev => [...prev, fileUrl]);
        } else if (activeStepIdForPhoto) {
          updateStepData(activeStepIdForPhoto, 'photo', fileUrl);
        }
      }
    } catch (error) {
      console.error("Upload ảnh thất bại", error);
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Tải ảnh thất bại.' });
      setIsMessageOpen(true);
    } finally {
      setIsUploadingImage(false);
      setActiveStepIdForPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (stepId) => {
    setActiveStepIdForPhoto(stepId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSave = async () => {
    if (!selectedProcessId || !processDetails) {
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Vui lòng chọn quy trình.' });
      setIsMessageOpen(true);
      return;
    }

    setIsSaving(true);
    const selectedProcess = processes.find(p => p.id.toString() === selectedProcessId.toString());
    const processCode = selectedProcess ? `${selectedProcess.code} - ${selectedProcess.name}` : 'NA';

    const payload = {
      inspection_type: inspectionType,
      product_sku: processCode,
      process_id: selectedProcessId,
      step_id: selectedStepId,
      data_json: JSON.stringify({
        process_code: processCode,
        steps: stepData,
        general_notes: notes,
        general_evidence: generalEvidence
      }),
      overall_result: overallConclusion,
      created_by: user?.username || 'QC'
    };

    try {
      await apiClient.post('/inspections/stage', payload);

      setMessageConfig({ type: 'success', title: 'Thành công', message: 'Đã lưu kết quả kiểm tra quy trình.' });
      setIsMessageOpen(true);

      // Reset form
      setOverallConclusion('pass');
      setNotes('');
      setGeneralEvidence([]);
      setStepData({});

      fetchHistory();
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setMessageConfig({ type: 'error', title: 'Thất bại', message: 'Có lỗi xảy ra khi lưu kết quả.' });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="Phiếu kiểm tra quy trình" />

        {/* Process Selection (Quy trình) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '8px' }}>Chọn quy trình cần kiểm tra</label>
          <select
            value={selectedProcessId}
            onChange={(e) => {
              setSelectedProcessId(e.target.value);
              setSelectedStepId('');
              setProcessDetails(null);
            }}
            style={{ width: '100%', height: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px', fontWeight: '600', color: '#4b301e', outline: 'none' }}
          >
            <option value="">-- Chọn quy trình --</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>

        {/* Process Details Card */}
        {selectedProcessId && (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', marginBottom: '16px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e8e1d5', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#4b301e', margin: 0 }}>Thông tin kiểm tra</h3>
              <button
                onClick={() => {
                  if (!processDetails) {
                    setMessageConfig({ type: 'error', title: 'Lưu ý', message: 'Vui lòng chọn hướng dẫn trước khi xem tài liệu' });
                    setIsMessageOpen(true);
                    return;
                  }
                  setIsIsoModalOpen(true);
                }}
                style={{ padding: '6px 12px', backgroundColor: '#4b301e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Xem QTKT
              </button>
            </div>

            {isProcessLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Đang tải chi tiết...</div>
            ) : processDetails && selectedProcessId ? (
              (() => {
                let workInstructions = [];
                if (processDetails.sections && processDetails.sections['__metadata_work_instructions__']) {
                  try {
                    workInstructions = JSON.parse(processDetails.sections['__metadata_work_instructions__']);
                  } catch (e) { }
                }

                // Fallback for older processes that don't use metadata
                if (workInstructions.length === 0 && processDetails.steps && processDetails.steps.length > 0) {
                  workInstructions = processDetails.steps.map((step, idx) => ({
                    id: step.id,
                    title: step.name || `Hướng dẫn ${idx + 1}`,
                    steps: step.checklist || []
                  }));
                }

                return (
                  <>
                    {/* Hướng dẫn Selection */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c6d5e', marginBottom: '4px', display: 'block' }}>Hướng dẫn thực hiện</label>
                      <select
                        value={selectedStepId}
                        onChange={(e) => setSelectedStepId(e.target.value)}
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', color: '#4b301e', outline: 'none' }}
                      >
                        <option value="">-- Chọn hướng dẫn --</option>
                        {workInstructions.map((inst, idx) => (
                          <option key={inst.id} value={inst.id}>{inst.title || `Hướng dẫn thực hiện ${idx + 1}`} ({(inst.steps || []).length} công đoạn)</option>
                        ))}
                      </select>
                    </div>

                    {selectedStepId && (() => {
                      const selectedInst = workInstructions.find(s => s.id.toString() === selectedStepId.toString());
                      const stepsList = selectedInst?.steps || [];

                      return (
                        <div style={{ backgroundColor: '#FAF6F0', borderRadius: '12px', padding: '12px', marginBottom: '16px', border: '1px solid #e8e1d5' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e', margin: '0 0 12px 0' }}>Công đoạn kiểm tra</h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {stepsList.length > 0 ? stepsList.map((item, idx) => {
                              const itemId = item.id || `item_${idx}`;
                              const data = stepData[itemId] || { result: 'pass', value: '', photo: '' };
                              const itemName = item.name || item.title || item.task || `Công đoạn ${idx + 1}`;
                              return (
                                <div key={itemId} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                  {/* Image Thumbnail / Icon */}
                                  <div
                                    onClick={() => triggerUpload(itemId)}
                                    style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, border: '1px solid #cbd5e1' }}
                                  >
                                    {data.photo ? (
                                      <img src={getImageUrl(data.photo)} alt="ev" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <ImageIcon size={20} color="#94a3b8" />
                                    )}
                                  </div>

                                  {/* Input Content */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#4b301e', marginBottom: '4px' }}>{itemName}</div>
                                    <input
                                      type="text"
                                      placeholder={`Ghi chú cho ${itemName.toLowerCase()}...`}
                                      value={data.value}
                                      onChange={(e) => updateStepData(itemId, 'value', e.target.value)}
                                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                    />
                                  </div>

                                  {/* Toggle Đạt / K.Đạt */}
                                  <div style={{ flexShrink: 0 }}>
                                    <MockupToggle
                                      value={data.result}
                                      onChange={(val) => updateStepData(itemId, 'result', val)}
                                    />
                                  </div>
                                </div>
                              );
                            }) : (
                              <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Không có công đoạn nào được định nghĩa trong hướng dẫn này.</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Overall Result */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e', margin: '0 0 8px 0' }}>Kết quả kiểm tra</h4>
                      <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '4px', border: '1px solid #cbd5e1' }}>
                        <button
                          onClick={() => setOverallConclusion('pass')}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: overallConclusion === 'pass' ? '#fff' : 'transparent',
                            color: overallConclusion === 'pass' ? '#10b981' : '#64748b',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            boxShadow: overallConclusion === 'pass' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                        >
                          Đạt
                        </button>
                        <button
                          onClick={() => setOverallConclusion('fail')}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: overallConclusion === 'fail' ? '#5d3b32' : 'transparent',
                            color: overallConclusion === 'fail' ? '#fff' : '#64748b',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            boxShadow: overallConclusion === 'fail' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                        >
                          Không đạt
                        </button>
                      </div>
                    </div>

                    {/* Evidence and Notes */}
                    <div style={{ marginBottom: '16px' }}>
                      <button
                        onClick={() => triggerUpload('general')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: 'none', color: '#4b301e', fontSize: '13px', fontWeight: '700', padding: 0, cursor: 'pointer', marginBottom: '12px' }}
                      >
                        <Plus size={16} /> Thêm bằng chứng kiểm tra
                      </button>

                      {generalEvidence.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px' }}>
                          {generalEvidence.map((url, i) => (
                            <div key={i} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #cbd5e1' }}>
                              <img src={getImageUrl(url)} alt={`ev-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      )}

                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c6d5e', marginBottom: '4px', display: 'block' }}>Ghi chú</label>
                      <textarea
                        rows="3"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Input text"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || isUploadingImage}
                        style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: (isSaving || isUploadingImage) ? 'not-allowed' : 'pointer' }}
                      >
                        <Check size={18} /> Xác nhận
                      </button>
                      <button
                        onClick={() => setSelectedProcessId('')}
                        style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <RotateCcw size={18} /> Hủy
                      </button>
                    </div>
                  </>
                );
              })()
            ) : null}
          </div>
        )}

        {/* History */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#4b301e', margin: 0 }}>Lịch sử kiểm tra trong ngày</h3>
            <ChevronUp size={20} color="#7B5233" />
          </div>

          {isHistoryLoading ? (
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Đang tải...</div>
          ) : filteredHistory.length > 0 ? (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e1d5', color: '#7c6d5e', fontSize: '12px' }}>
                    <th style={{ padding: '8px 4px', fontWeight: 'bold' }}>Quy trình</th>
                    <th style={{ padding: '8px 4px', fontWeight: 'bold' }}>Kết quả</th>
                    <th style={{ padding: '8px 4px', fontWeight: 'bold', textAlign: 'right' }}>TG</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, idx) => {
                    const dt = new Date(item.inspection_date);
                    const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
                    let procName = item.product_sku || 'NA';
                    try {
                      const data = JSON.parse(item.data_json || '{}');
                      if (data.process_code) procName = data.process_code;
                    } catch (e) { }

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 4px', fontSize: '13px', color: '#4b301e', fontWeight: '600' }}>{procName}</td>
                        <td style={{ padding: '12px 4px', fontSize: '13px', color: item.conclusion === 'pass' ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                          {item.conclusion === 'pass' ? 'Đạt' : 'Không đạt'}
                        </td>
                        <td style={{ padding: '12px 4px', fontSize: '12px', color: '#64748b', textAlign: 'right' }}>{timeStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button style={{ width: '100px', backgroundColor: '#5d3b32', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                Xem chi tiết
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có lịch sử.</div>
          )}
        </div>

        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={onFileChange} />

        {/* ISO Modal */}
        {isIsoModalOpen && processDetails && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setIsIsoModalOpen(false)} />
            <div style={{ position: 'relative', width: '90%', maxWidth: '400px', backgroundColor: '#f8fafc', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#4b301e', margin: 0 }}>Quy trình kiểm tra</h3>
                <button onClick={() => setIsIsoModalOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
              </div>

              <div style={{ display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <button
                  onClick={() => setIsoActiveTab('quick')}
                  style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: 'bold', color: isoActiveTab === 'quick' ? '#4b301e' : '#94a3b8', borderBottom: isoActiveTab === 'quick' ? '2px solid #5d3b32' : '2px solid transparent', cursor: 'pointer' }}
                >
                  Hướng dẫn nhanh
                </button>
                <button
                  onClick={() => setIsoActiveTab('detail')}
                  style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: 'bold', color: isoActiveTab === 'detail' ? '#4b301e' : '#94a3b8', borderBottom: isoActiveTab === 'detail' ? '2px solid #5d3b32' : '2px solid transparent', cursor: 'pointer' }}
                >
                  Quy trình chi tiết
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#fdfbf7' }}>
                {isoActiveTab === 'quick' ? (
                  <div style={{ color: '#4b301e', fontSize: '13px', lineHeight: '1.6' }}>
                    <div dangerouslySetInnerHTML={{ __html: processDetails.notes || 'Không có hướng dẫn nhanh.' }} />
                  </div>
                ) : (
                  <div style={{ color: '#4b301e', fontSize: '13px', lineHeight: '1.6' }}>
                    {Object.entries(processDetails.sections || {}).map(([title, content], i) => (
                      <div key={i} style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{title}</h4>
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                      </div>
                    ))}
                    {Object.keys(processDetails.sections || {}).length === 0 && 'Không có nội dung chi tiết.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <MessageModal
          isOpen={isMessageOpen}
          onConfirm={() => setIsMessageOpen(false)}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
        />
      </div>
    </Layout>
  );
};

export default StageProcessView;
