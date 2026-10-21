/**
 * Utilities cho Module Quản lý Chữ ký ISO (SmartFlow)
 */

export const SIGNATURE_TYPES = {
  HANDWRITTEN_IMAGE: {
    key: 'HANDWRITTEN_IMAGE',
    label: 'Ảnh chữ ký tay',
    badgeClass: 'sig-badge-image',
    description: 'Chữ ký viết tay tải lên từ tệp hình ảnh (PNG, JPG, SVG)',
    color: '#1D4ED8'
  },
  HANDWRITTEN_DRAW: {
    key: 'HANDWRITTEN_DRAW',
    label: 'Chữ ký vẽ trực tiếp',
    badgeClass: 'sig-badge-draw',
    description: 'Chữ ký viết tay vẽ trực tiếp bằng bảng cảm ứng / chuột',
    color: '#059669'
  },
  DIGITAL: {
    key: 'DIGITAL',
    label: 'Chữ ký số / Điện tử',
    badgeClass: 'sig-badge-digital',
    description: 'Chứng thư số điện tử CA / PKI / USB Token',
    color: '#7C3AED'
  }
};

export const APPROVAL_LEVELS = [
  'Cấp phòng',
  'Cấp công ty',
  'Cả hai'
];

export const DEPARTMENTS = [
  { code: 'BGD', name: 'Ban Giám Đốc' },
  { code: 'CL', name: 'Quản lý Chất Lượng (QLCL)' },
  { code: 'SX', name: 'Phòng Sản Xuất' },
  { code: 'KT', name: 'Phòng Kỹ Thuật' },
  { code: 'KHO', name: 'Bộ phận Kho & Giao vận' },
  { code: 'IT', name: 'Phòng Công Nghệ Thông Tin' },
  { code: 'HR', name: 'Phòng Hành Chính Nhân Sự' },
  { code: 'KD', name: 'Phòng Kinh Doanh' }
];

export const CA_PROVIDERS = [
  'SmartFlow Corporate PKI',
  'Viettel-CA (Tập đoàn Viettel)',
  'VNPT-CA (Tập đoàn VNPT)',
  'FPT-CA (Công ty TNHH FPT IS)',
  'BKAV-CA (Công ty An ninh mạng Bkav)',
  'CA2 (Nacencomm)',
  'EasyCA (Công ty CP Softdreams)',
  'Khác (Chứng thư tự cấp)'
];

/**
 * Định dạng ngày giờ Việt Nam
 */
export const formatVietnameseDateTime = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Định dạng ngày Việt Nam DD/MM/YYYY
 */
export const formatVietnameseDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * Sinh chuỗi Serial ngẫu nhiên cho Chữ ký điện tử
 */
export const generateRandomSerial = () => {
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
  return `${hex().substring(0, 2)}:${hex().substring(2, 4)}:${hex().substring(0, 2)}:${hex().substring(2, 4)}:${hex().substring(0, 2)}:${hex().substring(2, 4)}`;
};

/**
 * Sinh mã băm SHA-256 giả lập cho chữ ký điện tử
 */
export const generateSignatureHash = (name = 'SMARTFLOW', cert = '') => {
  const chars = '0123456789ABCDEF';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SHA256:${hash.substring(0, 16)}...${hash.substring(24, 32)}`;
};

/**
 * Xử lý tách nền trắng của ảnh chụp chữ ký sang trong suốt (Client-side background remover)
 */
export const makeSignatureBackgroundTransparent = (imageSrc, threshold = 225) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Nếu điểm ảnh sáng gần trắng (trên ngưỡng threshold), biến thành trong suốt
          if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // alpha = 0 (transparent)
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        // Fallback nếu dính CORS
        resolve(imageSrc);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
};
