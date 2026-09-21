import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, Mic, CheckCircle2, ShieldAlert, Copy, AlertTriangle, Play, Pause, Trash2, Image as ImageIcon } from 'lucide-react';
import { feedbackService } from '../services/feedback.service';
import { useToast } from '@shared/components/ToastContext';

export const FeedbackCreateReportView = () => {
  const { toast } = useToast();

  // Mã phiếu tự động từ Database
  const [ticketCode, setTicketCode] = useState('BC-01');

  // Người tạo & Ẩn danh
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [creatorName, setCreatorName] = useState('');

  // Phòng Ban & Bộ Phận (Lấy trực tiếp từ Database)
  const [rolesList, setRolesList] = useState([]);
  const [allDepartmentsList, setAllDepartmentsList] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');

  // Danh sách các Card (Mỗi Card gồm: Nội dung chính Vấn đề + Kiến nghị + Đoạn ghi âm)
  const [cards, setCards] = useState([
    {
      id: 1,
      content: '',
      solution: '',
      audioBlob: null,
      audioUrl: null,
      recordingDuration: 0,
      isPlayingAudio: false
    }
  ]);

  // Danh sách ảnh đính kèm: [{ id, file, previewUrl, name }]
  const [attachedImages, setAttachedImages] = useState([]);
  const fileInputRef = useRef(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

  // Trạng thái ghi âm hiện tại: { cardId, field: 'content' | 'solution' }
  const [recordingTarget, setRecordingTarget] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Audio & Speech-to-Text Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordingTargetRef = useRef(null);
  const audioElementsMap = useRef({});

  // Processing states
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedCode, setLastCreatedCode] = useState('');
  const [showMicHttpModal, setShowMicHttpModal] = useState(false);
  const [showPermissionDeniedModal, setShowPermissionDeniedModal] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const recordingDurationRef = useRef(0);
  const baseTextRef = useRef('');

  // =================== 1. TẢI DỮ LIỆU TỪ DATABASE ===================
  const loadNextCode = async () => {
    try {
      const res = await feedbackService.getNextCode();
      if (res && res.clean_code) {
        setTicketCode(res.clean_code);
      }
    } catch (e) {
      console.warn('Không thể tải mã phiếu tiếp theo:', e);
    }
  };

  useEffect(() => {
    const loadDbData = async () => {
      try {
        const [rolesRes, deptsRes] = await Promise.all([
          feedbackService.getRoles().catch(() => []),
          feedbackService.getDepartments().catch(() => [])
        ]);

        const roles = Array.isArray(rolesRes) ? rolesRes : [];
        const depts = Array.isArray(deptsRes) ? deptsRes : (deptsRes?.value || []);

        setRolesList(roles);
        setAllDepartmentsList(depts);

        if (roles.length > 0) {
          const defaultRole = roles.find(r => r.name === 'SX' || r.name === 'QLCL') || roles[0];
          setSelectedRoleId(defaultRole.id);

          const matchingDepts = depts.filter(d => d.role_id === defaultRole.id);
          if (matchingDepts.length > 0) {
            setSelectedDepartmentName(matchingDepts[0].name);
          } else {
            setSelectedDepartmentName('');
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải Phòng ban & Bộ phận từ Database:', err);
      }
    };

    loadDbData();
    loadNextCode();
  }, []);

  const handleRoleChange = (roleId) => {
    const numId = Number(roleId);
    setSelectedRoleId(numId);
    const matchingDepts = allDepartmentsList.filter(d => d.role_id === numId);
    if (matchingDepts.length > 0) {
      setSelectedDepartmentName(matchingDepts[0].name);
    } else {
      setSelectedDepartmentName('');
    }
  };

  const currentDepartments = useMemo(() => {
    if (!selectedRoleId) return [];
    return allDepartmentsList.filter(d => d.role_id === Number(selectedRoleId));
  }, [allDepartmentsList, selectedRoleId]);

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =================== 2. XỬ LÝ GHI ÂM NẰM TRONG MỖI Ô NHẬP ===================
  const startRecording = async (cardId, field) => {
    // Nếu đang ghi âm ở ô khác thì dừng trước
    if (recordingTargetRef.current) {
      stopRecording();
    }

    // Lưu lại nội dung hiện có để ghép nối realtime khi nói
    const currentCard = cards.find(c => c.id === cardId);
    baseTextRef.current = currentCard ? (currentCard[field] || '') : '';

    // Kiểm tra Secure Context: Trình duyệt chặn Micro trên HTTP (trừ localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
      setShowMicHttpModal(true);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setShowMicHttpModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      const target = { cardId, field };
      recordingTargetRef.current = target;
      recordingDurationRef.current = 0;
      setRecordingTarget(target);
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setCards(prev => prev.map(c => {
          if (c.id === cardId) {
            return {
              ...c,
              audioBlob: blob,
              audioUrl: url,
              recordingDuration: recordingDurationRef.current || 0
            };
          }
          return c;
        }));

        stream.getTracks().forEach(track => track.stop());
        recordingTargetRef.current = null;
        setRecordingTarget(null);
      };

      mediaRecorder.start();

      // Bộ đếm thời gian
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Web Speech API tự chuyển giọng nói thành văn bản tiếng Việt realtime
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let finalPart = '';
          let interimPart = '';
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalPart += transcript + ' ';
            } else {
              interimPart += transcript;
            }
          }

          const currentSpoken = (finalPart + interimPart).trim();
          if (currentSpoken) {
            const base = baseTextRef.current ? baseTextRef.current.trim() : '';
            const fullText = base ? `${base} ${currentSpoken}` : currentSpoken;
            setCards(prev => prev.map(c => {
              if (c.id === cardId) {
                return { ...c, [field]: fullText };
              }
              return c;
            }));
          }
        };

        recognition.onerror = (err) => {
          console.warn('SpeechRecognition error:', err);
        };

        recognition.onend = () => {
          // Tự động duy trì nhận diện nếu người dùng vẫn đang bật ghi âm
          if (recordingTargetRef.current && recordingTargetRef.current.cardId === cardId) {
            try {
              recognition.start();
            } catch (e) { }
          }
        };

        try {
          recognition.start();
        } catch (recErr) {
          console.warn('Không thể khởi động SpeechRecognition:', recErr);
        }
      } else {
        toast('info', 'Trình duyệt đang lưu file âm thanh giọng nói.');
      }
    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowPermissionDeniedModal(true);
      } else if (!window.isSecureContext) {
        setShowMicHttpModal(true);
      } else {
        toast('error', `Lỗi micro: ${err.message || 'Không thể mở thiết bị thu âm'}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    recordingTargetRef.current = null;
    setRecordingTarget(null);
    toast('success', 'Đã lưu ghi âm vào ô nội dung thành công!');
  };

  const handleDeleteAudio = (cardId) => {
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        if (c.audioUrl) URL.revokeObjectURL(c.audioUrl);
        return {
          ...c,
          audioBlob: null,
          audioUrl: null,
          recordingDuration: 0,
          isPlayingAudio: false
        };
      }
      return c;
    }));
  };

  const handleTogglePlayAudio = (cardId, audioUrl) => {
    let audio = audioElementsMap.current[cardId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioElementsMap.current[cardId] = audio;
      audio.onended = () => {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, isPlayingAudio: false } : c));
      };
    }

    const currentCard = cards.find(c => c.id === cardId);
    if (currentCard?.isPlayingAudio) {
      audio.pause();
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, isPlayingAudio: false } : c));
    } else {
      audio.play();
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, isPlayingAudio: true } : c));
    }
  };

  // =================== 3. THÊM / XÓA CARD (VẤN ĐỀ + KIẾN NGHỊ) ===================
  const handleAddCard = () => {
    const newId = Date.now();
    setCards(prev => [
      ...prev,
      {
        id: newId,
        content: '',
        solution: '',
        audioBlob: null,
        audioUrl: null,
        recordingDuration: 0,
        isPlayingAudio: false
      }
    ]);
  };

  const handleRemoveCard = (cardId) => {
    if (cards.length <= 1) return;
    const cardToDelete = cards.find(c => c.id === cardId);
    if (cardToDelete?.audioUrl) {
      URL.revokeObjectURL(cardToDelete.audioUrl);
    }
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  const handleCardFieldChange = (cardId, field, value) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, [field]: value } : c));
  };

  // =================== 4. XỬ LÝ HÌNH ẢNH MINH CHỨNG ===================
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name
    }));

    setAttachedImages(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (id) => {
    setAttachedImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // =================== 5. SUBMIT BÁO CÁO VÀO DATABASE ===================
  const executeSubmit = async () => {
    const validCards = cards.filter(c => c.content.trim().length > 0 || c.solution.trim().length > 0);
    if (validCards.length === 0 && attachedImages.length === 0) {
      toast('warning', 'Vui lòng nhập ít nhất một nội dung vấn đề hoặc đính kèm ảnh trước khi tạo báo cáo!');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Ghép nội dung các Card
      const combinedMainContent = cards
        .map((c, idx) => {
          const text = c.content.trim();
          if (!text) return null;
          return cards.length > 1 ? `[Vấn đề ${idx + 1}] ${text}` : text;
        })
        .filter(Boolean)
        .join('\n\n');

      const combinedSolution = cards
        .map((c, idx) => {
          const text = c.solution.trim();
          if (!text) return null;
          return cards.length > 1 ? `[Kiến nghị ${idx + 1}] ${text}` : text;
        })
        .filter(Boolean)
        .join('\n\n');

      // 2. Tìm file ghi âm đầu tiên có trong các Card để upload
      let uploadedAudioUrl = null;
      const cardWithAudio = cards.find(c => c.audioBlob !== null);
      if (cardWithAudio && cardWithAudio.audioBlob) {
        try {
          const uploadRes = await feedbackService.uploadAudio(cardWithAudio.audioBlob, `rec_${ticketCode}.webm`);
          uploadedAudioUrl = uploadRes?.url || null;
        } catch (uploadErr) {
          console.warn('Không thể tải file âm thanh lên máy chủ:', uploadErr);
        }
      }

      // 3. Tải các file hình ảnh đính kèm lên máy chủ
      const uploadedImageUrls = [];
      if (attachedImages.length > 0) {
        setUploadingImages(true);
        for (const item of attachedImages) {
          try {
            if (item.file) {
              const imgRes = await feedbackService.uploadImage(item.file);
              if (imgRes && imgRes.url) {
                uploadedImageUrls.push(imgRes.url);
              }
            } else if (item.url) {
              uploadedImageUrls.push(item.url);
            }
          } catch (uploadImgErr) {
            console.warn('Lỗi khi tải ảnh lên máy chủ:', uploadImgErr);
          }
        }
        setUploadingImages(false);
      }

      // 4. Tên Phòng Ban & Bộ Phận từ Database
      const selectedRoleObj = rolesList.find(r => r.id === Number(selectedRoleId));
      const departmentName = selectedRoleObj ? (selectedRoleObj.description || selectedRoleObj.name) : 'Sản xuất';
      const sectionName = selectedDepartmentName || 'Xưởng sản xuất';

      // 5. Tạo Payload chuẩn CSDL SmartFlow_v5
      const payload = {
        code: ticketCode.startsWith('BC-') ? ticketCode : `BC-${ticketCode.replace('BC', '')}`,
        report_type: 'Báo cáo vấn đề',
        creator_name: isAnonymous ? 'Ẩn danh' : (creatorName.trim() || 'Người dùng ẩn'),
        is_anonymous: isAnonymous,
        attendees: null,
        related_ticket: null,
        issue_type: departmentName,
        area: sectionName,
        main_content: combinedMainContent || 'Báo cáo sự cố kèm hình ảnh minh chứng',
        solution_recommendation: combinedSolution || null,
        images: JSON.stringify(uploadedImageUrls),
        audio_url: uploadedAudioUrl,
        status: 'Chờ xử lý'
      };

      const resp = await feedbackService.createReport(payload);
      const newCode = resp?.data?.code || ticketCode;
      setLastCreatedCode(newCode);

      // Reset form về trạng thái rỗng ban đầu
      cards.forEach(c => {
        if (c.audioUrl) URL.revokeObjectURL(c.audioUrl);
      });
      attachedImages.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setCards([{
        id: Date.now(),
        content: '',
        solution: '',
        audioBlob: null,
        audioUrl: null,
        recordingDuration: 0,
        isPlayingAudio: false
      }]);
      setAttachedImages([]);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      loadNextCode();
    } catch (err) {
      console.error('Lỗi khi tạo báo cáo:', err);
      toast('error', 'Không thể lưu phiếu báo cáo vào cơ sở dữ liệu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleResetForm = () => {
    cards.forEach(c => {
      if (c.audioUrl) URL.revokeObjectURL(c.audioUrl);
    });
    attachedImages.forEach(img => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    setCards([{
      id: Date.now(),
      content: '',
      solution: '',
      audioBlob: null,
      audioUrl: null,
      recordingDuration: 0,
      isPlayingAudio: false
    }]);
    setAttachedImages([]);
    toast('info', 'Đã hủy thao tác và đặt lại biểu mẫu.');
  };

  const hasAnyContent = cards.some(c => c.content.trim().length > 0 || c.audioBlob !== null) || attachedImages.length > 0;

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#E8DACE',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      padding: '0',
      boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        width: '100%',
        backgroundColor: '#F7F0E8',
        border: 'none',
        boxShadow: '0 6px 24px rgba(123, 82, 51, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* ===== PHẦN CỐ ĐỊNH: Tiêu đề + Thông tin phiếu ===== */}
        <div style={{
          flexShrink: 0,
          padding: '14px 16px 10px 16px',
          borderBottom: '1px solid #D4C4AD',
          backgroundColor: '#F7F0E8'
        }}>
          {/* Tiêu đề chính */}
          <h2 style={{
            textAlign: 'center',
            color: '#7B5233',
            fontSize: '1.25rem',
            fontWeight: '900',
            margin: '0 0 10px 0',
            letterSpacing: '0.5px'
          }}>
            Báo cáo vấn đề
          </h2>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid #D4C4AD',
            boxShadow: '0 2px 8px rgba(123, 82, 51, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>

            {/* Hàng Tiêu Đề Mã Phiếu & Checkbox Ẩn danh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '900',
                fontStyle: 'italic',
                color: '#7B5233'
              }}>
                Phiếu: {ticketCode}
              </div>

              {/* Checkbox Ẩn danh */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#7B5233', cursor: 'pointer' }}
                />
                Ẩn danh
              </label>
            </div>

            {/* Ô nhập "Được tạo bởi" */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569' }}>
                Được tạo bởi
              </label>
              <input
                type="text"
                disabled={isAnonymous}
                value={isAnonymous ? 'Ẩn danh' : creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Nhập họ và tên người báo cáo (không bắt buộc)..."
                style={{
                  width: '100%',
                  height: '34px',
                  boxSizing: 'border-box',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #C4B5A3',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  outline: 'none',
                  backgroundColor: isAnonymous ? '#F1F5F9' : '#FFFFFF',
                  color: isAnonymous ? '#94A3B8' : '#1E293B',
                  cursor: isAnonymous ? 'not-allowed' : 'text',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            {/* 2 Dropdowns Phòng Ban * và Bộ Phận */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569' }}>
                  Phòng Ban <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '8px',
                    border: '1px solid #C4B5A3',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#1E293B',
                    outline: 'none',
                    backgroundColor: '#FFF',
                    cursor: 'pointer'
                  }}
                >
                  {rolesList.length > 0 ? (
                    rolesList.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.description ? `${r.description} (${r.name})` : r.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Đang tải Phòng Ban...</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569' }}>
                  Bộ Phận
                </label>
                <select
                  value={selectedDepartmentName}
                  onChange={(e) => setSelectedDepartmentName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '8px',
                    border: '1px solid #C4B5A3',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    color: '#1E293B',
                    outline: 'none',
                    backgroundColor: '#FFF',
                    cursor: 'pointer'
                  }}
                >
                  {currentDepartments.length > 0 ? (
                    currentDepartments.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">Chung</option>
                  )}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* ===== PHẦN CUỘN: Danh sách Card Vấn đề + Kiến nghị ===== */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 80px 16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cards.map((card, index) => {
              const isContentRecording = recordingTarget?.cardId === card.id && recordingTarget?.field === 'content';
              const isSolutionRecording = recordingTarget?.cardId === card.id && recordingTarget?.field === 'solution';

              return (
                <div
                  key={card.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: '1.5px solid #D4C4AD',
                    boxShadow: '0 2px 8px rgba(123, 82, 51, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative'
                  }}
                >
                  {/* Header của từng Card: Chỉ gồm số thứ tự và nút Xóa Card */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #E0D3C4',
                    paddingBottom: '5px'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      color: '#7B5233',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#EBDDD0',
                        color: '#7B5233',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem'
                      }}>
                        {index + 1}
                      </span>
                      Vấn đề {index + 1}
                    </span>

                    {/* Nút Xóa Card nếu có nhiều hơn 1 card */}
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(card.id)}
                        title="Xóa vấn đề này"
                        style={{
                          background: '#F0E8DC',
                          border: '1px solid #D4C4AD',
                          borderRadius: '6px',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* 1. NỘI DUNG CHÍNH (VẤN ĐỀ) * - MICRO NẰM TRONG Ô NHẬP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569' }}>
                      Nội dung chính (Vấn đề) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        rows={2}
                        value={card.content}
                        onChange={(e) => handleCardFieldChange(card.id, 'content', e.target.value)}
                        placeholder="Nhập nội dung vấn đề (bấm Micro để nói)..."
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '8px 42px 8px 10px',
                          borderRadius: '8px',
                          border: isContentRecording ? '1.5px solid #DC2626' : '1px solid #C4B5A3',
                          fontSize: '0.84rem',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          lineHeight: 1.5,
                          backgroundColor: '#FFFFFF',
                          transition: 'border-color 0.2s ease'
                        }}
                      />

                      {/* Nút Ghi Âm nằm ngay bên trong ô nhập (góc trên bên phải) */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {!isContentRecording ? (
                          <button
                            type="button"
                            onClick={() => startRecording(card.id, 'content')}
                            title="Ghi âm giọng nói vào ô này"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '1px solid #C4B5A3',
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F0E8DC';
                              e.currentTarget.style.borderColor = '#7B5233';
                              e.currentTarget.style.color = '#7B5233';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.color = '#64748B';
                            }}
                          >
                            <Mic size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            title="Bấm để dừng ghi âm"
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '14px',
                              border: '1px solid #DC2626',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              boxShadow: '0 0 8px rgba(220, 38, 38, 0.3)'
                            }}
                          >
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#DC2626',
                              display: 'inline-block'
                            }} />
                            {formatDuration(recordingDuration)} Dừng
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. KIẾN NGHỊ * - MICRO NẰM TRONG Ô NHẬP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.76rem', fontWeight: '700', color: '#475569' }}>
                      Kiến nghị <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        rows={2}
                        value={card.solution}
                        onChange={(e) => handleCardFieldChange(card.id, 'solution', e.target.value)}
                        placeholder="Nhập kiến nghị, giải pháp xử lý (hoặc bấm Micro)..."
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '8px 42px 8px 10px',
                          borderRadius: '8px',
                          border: isSolutionRecording ? '1.5px solid #DC2626' : '1px solid #C4B5A3',
                          fontSize: '0.84rem',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          lineHeight: 1.5,
                          backgroundColor: '#FFFFFF',
                          transition: 'border-color 0.2s ease'
                        }}
                      />

                      {/* Nút Ghi Âm nằm ngay bên trong ô nhập (góc trên bên phải) */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {!isSolutionRecording ? (
                          <button
                            type="button"
                            onClick={() => startRecording(card.id, 'solution')}
                            title="Ghi âm giọng nói vào ô này"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#F8FAFC',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F0E8DC';
                              e.currentTarget.style.borderColor = '#7B5233';
                              e.currentTarget.style.color = '#7B5233';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.color = '#64748B';
                            }}
                          >
                            <Mic size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            title="Bấm để dừng ghi âm"
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '14px',
                              border: '1px solid #DC2626',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontSize: '0.74rem',
                              fontWeight: '800',
                              boxShadow: '0 0 8px rgba(220, 38, 38, 0.3)'
                            }}
                          >
                            <span style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#DC2626',
                              display: 'inline-block'
                            }} />
                            {formatDuration(recordingDuration)} Dừng
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}

            {/* Nút + Thêm dòng mới (Thêm 1 Card gồm Vấn đề + Kiến nghị) */}
            <button
              type="button"
              onClick={handleAddCard}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: '#7B5233',
                fontSize: '0.88rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 2px',
                marginTop: '2px'
              }}
            >
              <Plus size={18} strokeWidth={2.8} /> Thêm dòng mới
            </button>

            {/* PHẦN ĐÍNH KÈM HÌNH ẢNH (MINH CHỨNG SỰ CỐ) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1.5px solid #D4C4AD',
              boxShadow: '0 2px 8px rgba(123, 82, 51, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: '#7B5233',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ImageIcon size={16} />
                  Hình ảnh minh chứng {attachedImages.length > 0 && `(${attachedImages.length})`}
                </span>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#F5EBE1',
                    border: '1px solid #D4C4AD',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Thêm ảnh / Chụp ảnh
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {attachedImages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                  gap: '8px',
                  marginTop: '4px'
                }}>
                  {attachedImages.map(img => (
                    <div
                      key={img.id}
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #D4C4AD',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                      }}
                    >
                      <img
                        src={img.previewUrl}
                        alt="Ảnh minh chứng"
                        onClick={() => setSelectedPreviewImage(img.previewUrl)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        title="Xóa ảnh này"
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1.5px dashed #D4C4AD',
                    borderRadius: '8px',
                    padding: '14px 10px',
                    textAlign: 'center',
                    color: '#8C7B73',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    backgroundColor: '#FAF8F5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ImageIcon size={22} style={{ color: '#A89284' }} />
                  <span>Bấm vào đây để chọn ảnh hoặc chụp từ camera</span>
                </div>
              )}
            </div>
          </div>
        </div>{/* End scrollable area */}

        {/* Bottom Action Bar — cố định dưới */}
        <div style={{
          flexShrink: 0,
          backgroundColor: '#F7F0E8',
          borderTop: '1.5px solid #D4C4AD',
          padding: '10px 16px 12px 16px',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={handleResetForm}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '8px',
              border: '1.5px solid #7B5233',
              backgroundColor: '#FFFFFF',
              color: '#7B5233',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting || !hasAnyContent}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (!hasAnyContent || submitting) ? '#C4B5AA' : '#7B5233',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: (!hasAnyContent || submitting) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease'
            }}
          >
            {submitting ? (uploadingImages ? 'Đang tải ảnh...' : 'Đang lưu...') : 'Xác nhận'}
          </button>
        </div>

        {/* Modal Xác Nhận Gửi */}
        {showConfirmModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', marginBottom: '8px' }}>
                Xác nhận tạo báo cáo
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '22px' }}>
                Bạn có chắc chắn muốn gửi báo cáo sự cố gồm {cards.length} vấn đề và lưu vào hệ thống cơ sở dữ liệu không?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting ? '#C4B5AA' : '#7B5233',
                    fontWeight: '700',
                    color: '#FFF',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {submitting ? 'Đang lưu vào CSDL...' : 'Đồng ý'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Báo Thành Công */}
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#FFF',
              borderRadius: '16px',
              padding: '28px 24px',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={34} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1E293B', marginBottom: '8px' }}>
                Đã lưu thành công!
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '24px' }}>
                Đã tạo thành công phiếu báo cáo sự cố <strong>#{lastCreatedCode}</strong> và lưu trực tiếp vào cơ sở dữ liệu!
              </p>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#7B5233',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                + Tiếp tục tạo phiếu mới
              </button>
            </div>
          </div>
        )}

        {/* ===== MODAL HƯỚNG DẪN BẬT MICROPHONE TRÊN MẠNG LAN / HTTP ===== */}
        {showMicHttpModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px 20px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxSizing: 'border-box'
            }}>
              {/* Header Modal */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1E293B' }}>
                    Trình duyệt chặn Micro qua HTTP
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4 }}>
                    Theo chính sách bảo mật của Chrome & Edge, Micro chỉ được cấp khi chạy qua <strong>HTTPS</strong> hoặc <strong>localhost</strong>. Khi truy cập qua IP mạng nội bộ (<code>http://192.168.1.222:3001</code>), trình duyệt tự động khóa Micro.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMicHttpModal(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '2px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Hướng dẫn 3 cách khắc phục */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.78rem',
                color: '#334155',
                lineHeight: 1.45
              }}>
                <div>
                  <strong style={{ color: '#0F172A', display: 'block', marginBottom: '3px' }}>
                    🌟 Cách 1: Mở cờ Chrome (Khuyên dùng cho mạng LAN):
                  </strong>
                  1. Mở tab mới và dán vào thanh địa chỉ:
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '4px 0',
                    backgroundColor: '#EDE9FE',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.74rem',
                    color: '#5B21B6'
                  }}>
                    <span style={{ flex: 1, wordBreak: 'break-all' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText('chrome://flags/#unsafely-treat-insecure-origin-as-secure');
                        setCopiedFlag(true);
                        setTimeout(() => setCopiedFlag(false), 2000);
                      }}
                      style={{ border: 'none', background: '#DDD6FE', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.7rem', fontWeight: '700', color: '#4C1D95' }}
                    >
                      {copiedFlag ? 'Đã copy!' : 'Copy'}
                    </button>
                  </div>
                  2. Chọn <strong>Enabled</strong>, nhập vào ô địa chỉ: <code style={{ backgroundColor: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>http://192.168.1.222:3001</code>
                  <br />
                  3. Bấm nút <strong>Relaunch</strong> ở góc dưới để khởi động lại trình duyệt.
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <strong style={{ color: '#0F172A', display: 'block', marginBottom: '3px' }}>
                    🔒 Cách 2: Chạy với giao thức HTTPS:
                  </strong>
                  Chạy file <code style={{ backgroundColor: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>run_feedback_https.bat</code> trên máy chủ, sau đó truy cập:
                  <div style={{ margin: '4px 0' }}>
                    <a href="https://192.168.1.222:3001" style={{ color: '#2563EB', fontWeight: '700', textDecoration: 'underline' }}>
                      https://192.168.1.222:3001
                    </a> (Bấm <em>Nâng cao &rarr; Tiếp tục truy cập</em>).
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <strong style={{ color: '#0F172A', display: 'block', marginBottom: '3px' }}>
                    💻 Cách 3: Truy cập trên máy chủ:
                  </strong>
                  Mở trực tiếp link: <a href="http://localhost:3001" style={{ color: '#2563EB', fontWeight: '700' }}>http://localhost:3001</a> (Localhost luôn mở Micro 100%).
                </div>
              </div>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setShowMicHttpModal(false)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#7B5233',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}

        {/* ===== MODAL HƯỚNG DẪN KHI BỊ CHẶN QUYỀN MICRO TRÊN TRÌNH DUYỆT ===== */}
        {showPermissionDeniedModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px 20px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1E293B' }}>
                    Quyền Micro đang bị chặn
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    Trình duyệt đang cài đặt <strong>Chặn quyền Micro</strong> cho trang web này.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPermissionDeniedModal(false)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '2px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid #E2E8F0',
                fontSize: '0.82rem',
                color: '#334155',
                lineHeight: 1.6
              }}>
                <strong>Các bước bật lại Micro:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '18px' }}>
                  <li>Bấm vào <strong>biểu tượng ổ khóa 🔒</strong> (hoặc icon cài đặt trang) ngay bên cạnh thanh địa chỉ web phía trên.</li>
                  <li>Tìm mục <strong>Microphone (Micro)</strong> và gạt sang <strong>Cho phép (Allow)</strong>.</li>
                  <li>Bấm <strong>Tải lại trang (F5)</strong> và bấm lại nút Micro để thu âm.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={() => setShowPermissionDeniedModal(false)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#7B5233',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}

        {/* Modal Phóng to Ảnh Minh Chứng */}
        {selectedPreviewImage && (
          <div
            onClick={() => setSelectedPreviewImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={selectedPreviewImage}
                alt="Phóng to ảnh"
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedPreviewImage(null)}
                style={{
                  position: 'absolute',
                  top: '-14px',
                  right: '-14px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FeedbackCreateReportView;

