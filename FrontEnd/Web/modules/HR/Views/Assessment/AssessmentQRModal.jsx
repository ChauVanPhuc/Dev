import React, { useState } from 'react';
import { X, Copy, Check, Download, ExternalLink, QrCode, CheckCircle2 } from 'lucide-react';
import './assessment.css';

const AssessmentQRModal = ({ assessment, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!assessment) return null;

  // Xây dựng link làm bài công khai dựa trên URL hiện tại
  const baseUrl = window.location.origin;
  const assessmentLink = `${baseUrl}/assessment/${assessment.assessment_code || assessment.id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(assessmentLink)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(assessmentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `QR_Code_${assessment.assessment_code || 'Assessment'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(qrImageUrl, '_blank');
    }
  };

  const handleOpenQuiz = () => {
    window.open(`/assessment/${assessment.assessment_code || assessment.id}`, '_blank');
  };

  return (
    <div className="assessment-modal-overlay" onClick={onClose}>
      <div 
        className="assessment-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          position: 'relative',
          background: '#ffffff',
          border: '1px solid #e7dfd5',
          color: '#1c1917',
          padding: '28px 32px'
        }}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f5f5f4',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#78716c',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <X size={16} />
        </button>

        {/* Badge tiêu đề */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 16px',
          borderRadius: '20px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          color: '#92400e',
          fontSize: '12px',
          fontWeight: '700',
          marginBottom: '12px'
        }}>
          <QrCode size={14} color="#b45309" /> Mã QR & Link Làm Bài Trực Tuyến
        </div>

        {/* Tên bài kiểm tra */}
        <h2 style={{
          fontSize: '20px',
          fontWeight: '800',
          color: '#1c1917',
          margin: '0 0 18px 0',
          letterSpacing: '-0.01em',
          lineHeight: '1.4'
        }}>
          {assessment.title}
        </h2>

        {/* Thẻ chứa QR Code */}
        <div style={{
          background: '#fdfbf7',
          border: '1px solid #ebdccb',
          borderRadius: '20px',
          padding: '20px',
          display: 'inline-block',
          boxShadow: '0 4px 16px rgba(120, 80, 40, 0.06)',
          marginBottom: '16px'
        }}>
          <img 
            src={qrImageUrl} 
            alt="Mã QR Bài kiểm tra" 
            style={{ width: '200px', height: '200px', display: 'block', borderRadius: '10px' }}
          />
        </div>

        {/* Chú thích */}
        <p style={{
          fontSize: '13px',
          color: '#57534e',
          lineHeight: '1.5',
          margin: '0 0 16px 0',
          padding: '0 10px'
        }}>
          Nhân sự dùng máy ảnh điện thoại hoặc Zalo quét mã QR trên để truy cập nhanh và làm bài trực tiếp mà không cần cài đặt phần mềm.
        </p>

        {/* Hộp sao chép Link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#faf9f6',
          border: '1px solid #e7dfd5',
          borderRadius: '10px',
          padding: '4px 4px 4px 12px',
          marginBottom: '18px'
        }}>
          <span style={{
            flex: 1,
            fontSize: '12.5px',
            color: '#44403c',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left'
          }}>
            {assessmentLink}
          </span>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? '#10b981' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)'
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>

        {/* 2 Nút hành động */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={handleDownloadQR}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
            }}
          >
            <Download size={15} /> Tải ảnh QR (PNG)
          </button>

          <button
            onClick={handleOpenQuiz}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid #d6d3d1',
              color: '#44403c',
              borderRadius: '9px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ExternalLink size={15} /> Mở giao diện làm bài
          </button>
        </div>

        {/* Hướng dẫn triển khai tại nhà máy */}
        <div style={{
          background: '#fdfbf7',
          border: '1px solid #ebdccb',
          borderRadius: '12px',
          padding: '14px 16px',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: '800',
            color: '#059669',
            marginBottom: '8px'
          }}>
            <CheckCircle2 size={15} /> Hướng dẫn triển khai tại nhà máy:
          </div>
          <ol style={{
            margin: 0,
            paddingLeft: '16px',
            fontSize: '12px',
            color: '#57534e',
            lineHeight: '1.55'
          }}>
            <li style={{ marginBottom: '4px' }}>
              Tải ảnh QR Code và in dán tại bảng tin chuyền sản xuất, phòng họp hoặc gửi vào nhóm Zalo nội bộ.
            </li>
            <li style={{ marginBottom: '4px' }}>
              Nhân sự tham gia không cần tạo tài khoản: chỉ cần quét mã QR, nhập Họ tên, Vị trí và Đội ngũ là làm bài được ngay.
            </li>
            <li>
              Kết quả điểm số và phân loại Level sẽ tức thì cập nhật về Admin Dashboard.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AssessmentQRModal;
