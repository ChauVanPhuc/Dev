import React, { useState, useEffect, useMemo } from 'react';
import isoSignatureService from '@modules/ISOSignature/services/isoSignature.service';

/**
 * Component hiển thị khu vực chữ ký phê duyệt ở cuối tài liệu (Bottom Signatures) khi Xem Mẫu:
 * - Hiển thị theo hàng ngang và căn đều các cột.
 * - 2 cấp duyệt (Cấp phòng): 2 bên (Bên trái: Người làm/soạn thảo, Bên phải: Trưởng phòng duyệt).
 * - 3 cấp duyệt (Cấp công ty): 3 bên căn đều (Bên trái: Người làm, Ở giữa: Trưởng phòng, Bên phải: Ban Giám Đốc).
 * - 4 cấp duyệt (Cấp khách hàng): 4 cột căn đều (Người làm, Trưởng phòng, Ban Giám Đốc, Đại diện khách hàng).
 * - Tự động tra cứu và gắn mẫu chữ ký từ kho Chữ ký ISO (ISOSignature).
 */
export const DocumentBottomSignatures = ({
  documentLevel = 'Cấp phòng',
  author = '',
  approver = '',
  approverBgd = '',
  approverCustomer = '',
  department = '',
  status = '',
  issueDate = ''
}) => {
  const [signaturesList, setSignaturesList] = useState([]);

  useEffect(() => {
    isoSignatureService.getSignatures().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setSignaturesList(res);
      }
    }).catch(err => {
      console.error('Lỗi khi tải danh sách chữ ký mẫu:', err);
    });
  }, []);

  const isCompanyLevel = documentLevel === 'Cấp công ty';
  const statusLower = (status || '').toLowerCase().trim();

  // Kiểm tra trạng thái đã được ký duyệt thực tế chưa
  const isAuthorSigned = Boolean(author && author !== '---');
  const isDeptSigned = statusLower.includes('trưởng phòng đã duyệt') ||
                       statusLower.includes('chờ bgđ') ||
                       statusLower.includes('bgđ đã duyệt') ||
                       statusLower.includes('hiệu lực') ||
                       statusLower.includes('đang lưu hành') ||
                       statusLower.includes('đã duyệt');

  const isBgdSigned = isCompanyLevel && (
    statusLower.includes('bgđ đã duyệt') ||
    statusLower.includes('ban giám đốc đã duyệt') ||
    statusLower.includes('hiệu lực') ||
    statusLower.includes('đang lưu hành') ||
    (statusLower.includes('đã duyệt') && !statusLower.includes('chờ bgđ'))
  );

  // Tra cứu chữ ký từ kho lưu trữ theo tên hoặc mã người dùng
  const findSig = (name) => {
    if (!name || !signaturesList.length) return null;
    const cleanName = name.trim().toLowerCase();
    return signaturesList.find(s => 
      s.full_name?.toLowerCase() === cleanName ||
      s.full_name?.toLowerCase().includes(cleanName) ||
      cleanName.includes(s.full_name?.toLowerCase()) ||
      s.user_code?.toLowerCase() === cleanName
    );
  };

  const authorSig = useMemo(() => findSig(author), [signaturesList, author]);
  const deptSig = useMemo(() => findSig(approver), [signaturesList, approver]);
  const bgdSig = useMemo(() => findSig(approverBgd), [signaturesList, approverBgd]);

  // Xác định chính xác chức danh Trưởng phòng theo phòng ban (QLCL, SX, KD, KT, Kho, ...)
  const deptApproverTitle = useMemo(() => {
    const rawDept = (department || deptSig?.department || '').toUpperCase().trim();
    if (rawDept === 'CL' || rawDept === 'QC' || rawDept.includes('CHẤT LƯỢNG')) {
      return 'TRƯỞNG PHÒNG QLCL';
    }
    if (rawDept === 'SX' || rawDept.includes('SẢN XUẤT')) {
      return 'TRƯỞNG PHÒNG SX';
    }
    if (rawDept === 'KD' || rawDept.includes('KINH DOANH')) {
      return 'TRƯỞNG PHÒNG KD';
    }
    if (rawDept === 'KT' || rawDept.includes('KỸ THUẬT')) {
      return 'TRƯỞNG PHÒNG KT';
    }
    if (rawDept === 'KHO') {
      return 'TRƯỞNG PHÒNG KHO';
    }
    if (deptSig?.position) {
      const posLower = deptSig.position.toLowerCase();
      if (posLower.includes('chất lượng')) return 'TRƯỞNG PHÒNG QLCL';
      if (posLower.includes('sản xuất')) return 'TRƯỞNG PHÒNG SX';
      if (posLower.includes('kinh doanh')) return 'TRƯỞNG PHÒNG KD';
      if (posLower.includes('kỹ thuật')) return 'TRƯỞNG PHÒNG KT';
    }
    if (rawDept) {
      return `TRƯỞNG PHÒNG ${rawDept}`;
    }
    return 'TRƯỞNG PHÒNG';
  }, [department, deptSig]);

  // Xây dựng danh sách các vị trí ký duyệt theo cấp duyệt
  const signers = useMemo(() => {
    const list = [
      {
        role: 'NGƯỜI LẬP',
        subRole: 'Người soạn thảo',
        name: author || '---',
        hasSigned: isAuthorSigned,
        sig: authorSig
      },
      {
        role: deptApproverTitle,
        subRole: 'Cấp phòng duyệt',
        name: isDeptSigned ? (approver || 'Trưởng phòng') : '---',
        hasSigned: isDeptSigned,
        sig: deptSig
      }
    ];

    if (isCompanyLevel) {
      list.push({
        role: 'BAN GIÁM ĐỐC',
        subRole: 'Cấp công ty duyệt',
        name: isBgdSigned ? (approverBgd || 'Ban Giám Đốc') : '---',
        hasSigned: isBgdSigned,
        sig: bgdSig
      });
    }

    return list;
  }, [
    author, approver, approverBgd,
    isAuthorSigned, isDeptSigned, isBgdSigned,
    authorSig, deptSig, bgdSig,
    deptApproverTitle, isCompanyLevel
  ]);

  // Hàm render hiển thị chữ ký
  const renderSignature = (s) => {
    if (!s.hasSigned) {
      return (
        <div style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontStyle: 'italic',
          fontSize: '9.5pt'
        }}>
          (Chưa ký)
        </div>
      );
    }

    const isDigital = s.sig?.signature_type === 'DIGITAL';
    if (isDigital) {
      return (
        <div style={{
          height: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px'
        }}>
          <div style={{
            border: '1.5px solid #16a34a',
            backgroundColor: '#f0fdf4',
            padding: '3px 10px',
            borderRadius: '4px',
            fontSize: '8.5pt',
            color: '#15803d',
            fontWeight: 'bold',
            fontFamily: 'sans-serif'
          }}>
            ✓ KÝ SỐ CA
          </div>
          <span style={{ fontSize: '8pt', color: '#16a34a' }}>Đã xác thực</span>
        </div>
      );
    }

    const imgSrc = s.sig?.signature_data || s.sig?.image_path || s.sig?.image_url;
    if (imgSrc) {
      return (
        <div style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={imgSrc}
            alt={s.role}
            style={{
              maxHeight: '58px',
              maxWidth: '140px',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    // Chữ ký tay thư pháp mềm mại
    return (
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Dancing Script', 'Brush Script MT', cursive, serif",
        fontSize: '1.35rem',
        color: '#002B7F',
        fontWeight: 'bold'
      }}>
        {s.name}
      </div>
    );
  };

  return (
    <div
      className="a4-bottom-signatures"
      style={{
        width: '100%',
        marginTop: '36px',
        paddingTop: '16px',
        fontFamily: "'Times New Roman', Times, serif",
        color: '#000',
        pageBreakInside: 'avoid'
      }}
    >
      {/* Hàng chữ ký dàn ngang, căn đều theo số lượng cấp ký */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          gap: '16px'
        }}
      >
        {signers.map((s, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0 4px',
              minWidth: 0
            }}
          >
            {/* Tiêu đề vai trò duyệt */}
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '11pt',
                textTransform: 'uppercase',
                color: '#000',
                lineHeight: 1.3,
                marginBottom: '2px'
              }}
            >
              {s.role}
            </div>

            {/* Dòng ghi chú ký tên */}
            <div
              style={{
                fontStyle: 'italic',
                fontSize: '9.5pt',
                color: '#4b5563',
                marginBottom: '6px'
              }}
            >
              (Ký, ghi rõ họ tên)
            </div>

            {/* Khung ảnh chữ ký thực tế */}
            <div style={{ width: '100%', margin: '4px 0' }}>
              {renderSignature(s)}
            </div>

            {/* Họ và tên in đậm dưới chữ ký */}
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '11pt',
                color: '#000',
                marginTop: '4px',
                minHeight: '20px'
              }}
            >
              {s.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentBottomSignatures;
