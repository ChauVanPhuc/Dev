import React from 'react';

export const COLUMN_CONFIG = [
  { key: 'management_group', label: '1. Nhóm tài liệu quản lý' },
  { key: 'code_of_conduct', label: '2. Quy tắc ứng xử (PA)' },
  { key: 'classification', label: '3. Phân loại' },
  { key: 'suggested_doc_code', label: '4. Mã TL đề xuất', isCore: true },
  { key: 'document_name', label: '5. Tên tài liệu', isCore: true },
  { key: 'department_in_charge', label: '6. Phòng ban' },
  { key: 'edition', label: '7. Lần ban hành' },
  { key: 'issue_date', label: '8. Ngày ban hành' },
  { key: 'last_modified_date', label: '9. Ngày hiệu chỉnh' },
  { key: 'management_doc', label: '10. Luật liên quan' },
  { key: 'source_status', label: '11. Trạng thái', isCore: true },
  { key: 'notes', label: '12. Ghi chú' }
];

export const formatClassificationText = (cls) => {
  if (!cls) return 'Tài liệu';
  const c = cls.toString().toUpperCase().trim();
  if (c.includes('TÀI LIỆU') || c.includes('TL')) return 'Tài liệu';
  if (c.includes('BIỂU MẪU') || c.includes('BM')) return 'Biểu mẫu';
  if (c.includes('HỒ SƠ') || c.includes('HS')) return 'Hồ sơ';
  if (c.includes('HƯỚNG DẪN') || c.includes('HD')) return 'Hướng dẫn';
  return cls;
};

export const renderClassificationBadge = (cls) => {
  const c = (cls || '').toUpperCase().trim();
  let bg = '#EFF6FF';
  let color = '#1D4ED8';
  let border = '#BFDBFE';
  let text = 'Tài liệu';

  if (c.includes('BIỂU MẪU') || c.includes('BM')) {
    bg = '#F0FDF4';
    color = '#15803D';
    border = '#BBF7D0';
    text = 'Biểu mẫu';
  } else if (c.includes('HỒ SƠ') || c.includes('HS')) {
    bg = '#FAF5FF';
    color = '#7E22CE';
    border = '#E9D5FF';
    text = 'Hồ sơ';
  } else if (c.includes('HƯỚNG DẪN') || c.includes('HD')) {
    bg = '#FFFBEB';
    color = '#B45309';
    border = '#FDE68A';
    text = 'Hướng dẫn';
  }

  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '0.72rem',
      fontWeight: '700',
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  );
};

/**
 * Trạng thái hồ sơ: Ở giai đoạn này chỉ có 'Nháp' hoặc 'Đang chỉnh'
 */
export const renderDocStatusBadge = (status) => {
  const s = (status || '').toLowerCase().trim();
  const isEditing = s.includes('chỉnh') || s.includes('editing') || s.includes('sửa');

  if (isEditing) {
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.74rem',
        fontWeight: '700',
        backgroundColor: '#FEF3C7',
        color: '#B45309',
        border: '1px solid #FDE68A',
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        Đang chỉnh
      </span>
    );
  }

  // Mặc định là Nháp
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '0.74rem',
      fontWeight: '700',
      backgroundColor: '#F1F5F9',
      color: '#475569',
      border: '1px solid #CBD5E1',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    }}>
      Nháp
    </span>
  );
};

export const getExcelColName = (colIndex) => {
  let name = '';
  let num = colIndex;
  while (num >= 0) {
    name = String.fromCharCode((num % 26) + 65) + name;
    num = Math.floor(num / 26) - 1;
  }
  return name;
};

export const formatDateOnly = (dateStr) => {
  if (!dateStr) return '---';
  const str = dateStr.toString().trim();
  if (!str || str === '---') return '---';

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}/${month}/${year}`;
  }

  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  const spaceIdx = str.indexOf(' ');
  if (spaceIdx > 0) {
    return str.substring(0, spaceIdx);
  }

  return str;
};

