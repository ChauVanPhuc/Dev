import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import CandidateEntranceView from './CandidateEntranceView';
import CandidateQuizView from './CandidateQuizView';
import CandidateResultView from './CandidateResultView';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import '../Assessment/assessment.css';

const CandidatePortalContainer = () => {
  const { code, id } = useParams();
  const quizIdentifier = code || id;
  const navigate = useNavigate();

  const [step, setStep] = useState('loading'); // 'loading' | 'entrance' | 'quiz' | 'result' | 'error'
  const [assessment, setAssessment] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Nếu URL là /assessment/result/:submissionId
  const isDirectResultView = window.location.pathname.includes('/assessment/result/');

  useEffect(() => {
    if (isDirectResultView && quizIdentifier) {
      setStep('loading');
      api.get(`/assessment/result/${quizIdentifier}`)
        .then(res => {
          setResultData(res);
          setStep('result');
        })
        .catch(err => {
          setErrorText(err.response?.data?.detail || 'Không tìm thấy kết quả làm bài này.');
          setStep('error');
        });
    } else if (quizIdentifier) {
      setStep('loading');
      api.get(`/assessment/public/${quizIdentifier}`)
        .then(res => {
          setAssessment(res);
          setStep('entrance');
        })
        .catch(err => {
          setErrorText(err.response?.data?.detail || 'Bài kiểm tra không tồn tại hoặc đã kết thúc.');
          setStep('error');
        });
    }
  }, [quizIdentifier, isDirectResultView]);

  const handleStartQuiz = (info) => {
    setCandidateInfo(info);
    setStep('quiz');
  };

  const handleSubmitQuiz = async (payload) => {
    setSubmitting(true);
    try {
      const res = await api.post('/assessment/submit', payload);
      setResultData(res);
      setStep('result');
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi nộp bài thi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="candidate-portal-wrapper">
        <div style={{ textAlign: 'center', color: '#818cf8' }}>
          <RefreshCw size={40} className="spin" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>Đang chuẩn bị đề thi...</h3>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="candidate-portal-wrapper">
        <div className="candidate-form-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 8px 0' }}>
            Không thể tải bài kiểm tra
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            {errorText}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px', borderRadius: '10px',
              background: '#6366f1', color: '#fff', border: 'none',
              fontWeight: '700', fontSize: '14px', cursor: 'pointer'
            }}
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (step === 'entrance') {
    return (
      <CandidateEntranceView
        assessment={assessment}
        onStart={handleStartQuiz}
      />
    );
  }

  if (step === 'quiz') {
    return (
      <CandidateQuizView
        assessment={assessment}
        candidateInfo={candidateInfo}
        onSubmit={handleSubmitQuiz}
        submitting={submitting}
      />
    );
  }

  if (step === 'result') {
    return (
      <CandidateResultView
        result={resultData}
        onRestart={() => {
          setCandidateInfo(null);
          setResultData(null);
          setStep('entrance');
        }}
      />
    );
  }

  return null;
};

export default CandidatePortalContainer;
