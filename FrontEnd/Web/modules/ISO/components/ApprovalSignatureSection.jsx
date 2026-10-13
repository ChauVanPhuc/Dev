import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import isoSignatureService from '@modules/ISOSignature/services/isoSignature.service';

/**
 * Component hiển thị khu vực chữ ký phê duyệt ISO hình vuông nhỏ gọn (Square-Compact):
 * - Không cho chọn người (chỉ hiển thị tên & chữ ký in thẳng từ hồ sơ duyệt)
 * - Các ô kích thước vừa vặn (130px x 88px) không bị cắt ngắn thành 3 chấm (...)
 * - Tiêu đề phòng ban rõ ràng: "Trưởng phòng QLCL", "Trưởng phòng SX", "Trưởng phòng KD", v.v.
 * - Cấp phòng: 2 ô (Người lập, Trưởng phòng QLCL/SX/...)
 * - Cấp công ty: 3 ô (Người lập, Trưởng phòng QLCL/SX/..., Ban Giám Đốc)
 * - Cấp khách hàng / 4 cấp: hiển thị dạng 2x2
 * - Khi chưa duyệt: hiển thị "Chưa ký"
 */
export const ApprovalSignatureSection = ({
  documentLevel = 'Cấp phòng',
  author = '',
  approver = '',
  approverBgd = '',
  approverCustomer = '',
  department = '',
  status = ''
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
  const customerSig = useMemo(() => findSig(approverCustomer), [signaturesList, approverCustomer]);

  // Chữ ký phê duyệt mặc định để trống:
  // Không tự động giả lập đã ký chỉ vì có tên người soạn, chỉ hiển thị khi có chữ ký thật hoặc đã ký duyệt số
  const isAuthorSigned = Boolean(authorSig && (statusLower.includes('đã ký') || statusLower.includes('đã duyệt')));
  const isDeptSigned = Boolean(deptSig && (statusLower.includes('trưởng phòng đã duyệt') || statusLower.includes('bgđ đã duyệt')));
  const isBgdSigned = Boolean(isCompanyLevel && bgdSig && (statusLower.includes('bgđ đã duyệt') || statusLower.includes('ban giám đốc đã duyệt')));

  // Xác định chính xác chức danh Trưởng phòng theo phòng ban (QLCL, SX, KD, KT, Kho, ...)
  const deptApproverTitle = useMemo(() => {
    const rawDept = (department || deptSig?.department || '').toUpperCase().trim();
    if (rawDept === 'CL' || rawDept === 'QC' || rawDept.includes('CHẤT LƯỢNG')) {
      return 'Trưởng phòng QLCL';
    }
    if (rawDept === 'SX' || rawDept.includes('SẢN XUẤT')) {
      return 'Trưởng phòng SX';
    }
    if (rawDept === 'KD' || rawDept.includes('KINH DOANH')) {
      return 'Trưởng phòng KD';
    }
    if (rawDept === 'KT' || rawDept.includes('KỸ THUẬT')) {
      return 'Trưởng phòng KT';
    }
    if (rawDept === 'KHO') {
      return 'Trưởng phòng Kho';
    }
    if (deptSig?.position) {
      const posLower = deptSig.position.toLowerCase();
      if (posLower.includes('chất lượng')) return 'Trưởng phòng QLCL';
      if (posLower.includes('sản xuất')) return 'Trưởng phòng SX';
      if (posLower.includes('kinh doanh')) return 'Trưởng phòng KD';
      if (posLower.includes('kỹ thuật')) return 'Trưởng phòng KT';
    }
    if (rawDept) {
      return `Trưởng phòng ${rawDept}`;
    }
    return 'Trưởng phòng';
  }, [department, deptSig]);

  // Xây dựng danh sách các ô người ký
  const signers = [
    {
      role: 'Người lập',
      name: author || '---',
      sig: authorSig,
      hasSigned: isAuthorSigned
    },
    {
      role: deptApproverTitle,
      name: isDeptSigned ? (approver || '---') : (approver || '---'),
      sig: deptSig,
      hasSigned: isDeptSigned
    }
  ];

  if (isCompanyLevel) {
    signers.push({
      role: 'Ban Giám Đốc',
      name: isBgdSigned ? (approverBgd || '---') : (approverBgd || '---'),
      sig: bgdSig,
      hasSigned: isBgdSigned
    });
  }

  return (
    <div>
      <label style={{
        fontSize: '0.73rem',
        fontWeight: '700',
        color: '#4B5563',
        display: 'block',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Chữ ký phê duyệt
      </label>

      {/* Grid các ô chữ ký vừa vặn không bị cắt 3 chấm (130px x 88px) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${signers.length}, 130px)`,
        gap: '8px'
      }}>
        {signers.map((s, idx) => {
          const isDigital = s.sig?.signature_type === 'DIGITAL';
          return (
            <div
              key={idx}
              style={{
                width: '130px',
                height: '88px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '5px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              {/* Vai trò (Trưởng phòng QLCL, Người lập, Ban Giám Đốc...) */}
              <div
                style={{
                  fontSize: '0.67rem',
                  fontWeight: 700,
                  color: '#4B5563',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  width: '100%',
                  lineHeight: 1.2
                }}
              >
                {s.role}
              </div>

              {/* Tên người ký (in thẳng từ hồ sơ) */}
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#1F2937',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  margin: '1px 0'
                }}
                title={s.name}
              >
                {s.name}
              </div>

              {/* Ô hiển thị chữ ký: mặc định để trống */}
              <div style={{
                width: '100%',
                height: '36px',
                backgroundColor: '#FAFAF9',
                border: '1px dashed #E5E7EB',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '2px',
                boxSizing: 'border-box'
              }}>
                {s.hasSigned && isDigital ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', lineHeight: 1 }}>
                    <ShieldCheck size={13} color="#2563EB" />
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1E40AF' }}>
                      PKI CA
                    </span>
                  </div>
                ) : s.hasSigned && s.sig?.signature_data ? (
                  <img
                    src={s.sig.signature_data}
                    alt={s.role}
                    style={{ maxHeight: '30px', maxWidth: '110px', objectFit: 'contain' }}
                  />
                ) : s.hasSigned && s.sig?.image_path ? (
                  <img
                    src={s.sig.image_path}
                    alt={s.role}
                    style={{ maxHeight: '30px', maxWidth: '110px', objectFit: 'contain' }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalSignatureSection;
