import api from '@webShared/Services/api.service';

const removeDiacritics = (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd');
};

const isGenericNameText = (text) => {
  if (!text) return false;
  const clean = removeDiacritics(text.normalize('NFC')).trim().toLowerCase().replace(/[\[\]]/g, '');
  const genericPlaceholders = ['ten quy trinh', 'ten tai lieu', 'ten bieu mau', 'ten van ban', 'ten', 'quy trinh kiem soat chat luong moi'];
  return genericPlaceholders.includes(clean);
};

const cleanDocumentTitle = (text) => {
  if (!text) return '';
  let str = text.trim();
  str = str.replace(/^(?:tên\s+tài\s+liệu|tên\s+quy\s+trình|tên\s+biểu\s+mẫu|tiêu\s+đề|document\s+title)\s*[:：\-]\s*/i, '');
  if (isGenericNameText(str)) return '';
  return str.trim();
};

const generateNextQTCode = async (isProcess) => {
  try {
    const url = isProcess ? '/iso-documents/processes' : '/iso-documents';
    const items = await api.get(url);
    let maxNum = 0;
    items.forEach(item => {
      if (item.code) {
        const match = item.code.match(/G7\.CL\s*-QT(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    const nextNum = maxNum + 1;
    const formattedNum = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    return `G7.CL -QT${formattedNum}`;
  } catch (error) {
    console.error("Lỗi khi sinh mã tự động:", error);
    return 'G7.CL -QT01';
  }
};

export { removeDiacritics, isGenericNameText, cleanDocumentTitle, generateNextQTCode };
