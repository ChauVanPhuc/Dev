import api from '@webShared/Services/api.service';

/**
 * Service API cho Module Quản lý Chữ ký ISO (SmartFlow)
 * Hỗ trợ giao tiếp RESTful API Backend và cơ chế dự phòng LocalStorage thông minh.
 */

const LOCAL_STORAGE_KEY = 'smartflow_iso_signatures_data';

// Dữ liệu mẫu khởi tạo phong phú
const INITIAL_MOCK_SIGNATURES = [
  {
    id: 1,
    user_code: 'TP_QLCL',
    full_name: 'Nguyễn Văn An',
    department: 'CL',
    position: 'Trưởng phòng Quản lý Chất lượng',
    approval_level: 'Cấp phòng',
    signature_type: 'HANDWRITTEN_IMAGE',
    image_path: '',
    signature_data: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M20,45 Q40,15 65,35 T110,30 T150,25 Q130,55 90,52 T35,48' fill='none' stroke='%23003399' stroke-width='2.5' stroke-linecap='round'/><text x='115' y='60' font-family='sans-serif' font-size='11' font-weight='bold' fill='%23003399'>NV An</text></svg>",
    digital_cert_provider: 'SmartFlow PKI',
    digital_serial_no: '45:01:FA:88:20:26',
    digital_valid_from: '2026-01-01',
    digital_valid_to: '2028-01-01',
    digital_hash: 'SHA256:5A12D90F88E...410B',
    is_default: true,
    is_active: true,
    notes: 'Chữ ký tay chính thức của Trưởng phòng QLCL phê duyệt quy trình và biểu mẫu ISO',
    created_at: '2026-02-15 08:30:00',
    updated_at: '2026-03-01 10:15:00'
  },
  {
    id: 2,
    user_code: 'BGD_CEO',
    full_name: 'Trần Đình Hùng',
    department: 'BGD',
    position: 'Tổng Giám Đốc',
    approval_level: 'Cấp công ty',
    signature_type: 'DIGITAL',
    signature_data: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M20,40 Q50,10 80,30 T130,20 Q160,40 170,30 M30,50 L150,45' fill='none' stroke='%23003399' stroke-width='2.6' stroke-linecap='round'/><text x='110' y='60' font-family='sans-serif' font-size='11' font-weight='bold' fill='%23003399'>TD Hung</text></svg>",
    digital_cert_provider: 'SmartFlow Corporate PKI (Viettel-CA)',
    digital_serial_no: '54:02:FA:7E:99:20:26:01',
    digital_valid_from: '2026-01-01',
    digital_valid_to: '2028-12-31',
    digital_hash: 'SHA256:7B8C4A21E90F3D82...B14C9E6A',
    is_default: true,
    is_active: true,
    notes: 'Chứng thư số cấp cao của Ban Giám Đốc dùng cho phê duyệt ban hành tài liệu toàn công ty',
    created_at: '2026-01-10 09:00:00',
    updated_at: '2026-01-10 09:00:00'
  },
  {
    id: 3,
    user_code: 'TP_SX',
    full_name: 'Lê Hoàng Long',
    department: 'SX',
    position: 'Trưởng phòng Sản Xuất',
    approval_level: 'Cả hai',
    signature_type: 'HANDWRITTEN_DRAW',
    signature_data: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M25,50 Q45,20 70,40 C95,60 120,20 145,35 M80,25 Q110,65 155,50' fill='none' stroke='%23111827' stroke-width='2.4' stroke-linecap='round'/><text x='110' y='62' font-family='sans-serif' font-size='11' font-weight='bold' fill='%23111827'>LH Long</text></svg>",
    is_default: true,
    is_active: true,
    notes: 'Chữ ký vẽ tay trực tiếp bằng bảng ký cảm ứng SmartFlow',
    created_at: '2026-02-20 14:20:00',
    updated_at: '2026-03-05 16:45:00'
  },
  {
    id: 4,
    user_code: 'QA_ADMIN',
    full_name: 'Phạm Thị Mai',
    department: 'CL',
    position: 'Kiểm soát Tài liệu & Hệ thống ISO',
    approval_level: 'Cấp phòng',
    signature_type: 'HANDWRITTEN_IMAGE',
    signature_data: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='70' viewBox='0 0 180 70'><path d='M20,38 Q50,15 80,42 T130,28 Q155,40 160,30 M40,55 L140,50' fill='none' stroke='%23003399' stroke-width='2.2' stroke-linecap='round'/><text x='118' y='63' font-family='sans-serif' font-size='10' font-weight='bold' fill='%23003399'>PT Mai</text></svg>",
    is_default: false,
    is_active: true,
    notes: 'Chữ ký soát xét và rà soát hồ sơ quy trình chuẩn ISO',
    created_at: '2026-02-18 11:10:00',
    updated_at: '2026-02-18 11:10:00'
  },
  {
    id: 5,
    user_code: 'TP_KT',
    full_name: 'Vũ Đức Trí',
    department: 'KT',
    position: 'Trưởng phòng Kỹ Thuật',
    approval_level: 'Cấp phòng',
    signature_type: 'DIGITAL',
    digital_cert_provider: 'VNPT-CA (Tập đoàn VNPT)',
    digital_serial_no: '88:41:09:BC:AA:12:04:99',
    digital_valid_from: '2025-11-01',
    digital_valid_to: '2027-11-01',
    digital_hash: 'SHA256:4C92F0189A120D5E...E4129A88',
    is_default: true,
    is_active: false,
    notes: 'Chứng thư số thẩm định tiêu chuẩn kỹ thuật bản vẽ và BOM',
    created_at: '2025-11-02 09:30:00',
    updated_at: '2026-01-20 15:00:00'
  }
];

const getStoredSignatures = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Lỗi đọc localStorage chữ ký:', e);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_SIGNATURES));
  return INITIAL_MOCK_SIGNATURES;
};

const saveStoredSignatures = (data) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Lỗi lưu localStorage chữ ký:', e);
  }
};

export const isoSignatureService = {
  /**
   * Lấy số liệu thống kê KPI chữ ký
   */
  getStats: async () => {
    try {
      const res = await api.get('/iso-signatures/stats');
      if (res && typeof res === 'object') return res;
    } catch (err) {
      console.warn('API /iso-signatures/stats không khả dụng, sử dụng bộ nhớ cục bộ:', err.message);
    }
    
    // Fallback tính toán từ local storage
    const list = getStoredSignatures();
    const total = list.length;
    const handwritten_image_count = list.filter(i => i.signature_type === 'HANDWRITTEN_IMAGE').length;
    const handwritten_draw_count = list.filter(i => i.signature_type === 'HANDWRITTEN_DRAW').length;
    const digital_count = list.filter(i => i.signature_type === 'DIGITAL').length;
    const active_count = list.filter(i => i.is_active === true).length;
    const inactive_count = total - active_count;

    return {
      total,
      handwritten_image_count,
      handwritten_draw_count,
      digital_count,
      active_count,
      inactive_count
    };
  },

  /**
   * Lấy danh sách chữ ký kèm bộ lọc
   */
  getSignatures: async (params = {}) => {
    try {
      const res = await api.get('/iso-signatures/list', { params });
      if (Array.isArray(res)) {
        // Cập nhật lại cache local
        if (res.length > 0) saveStoredSignatures(res);
        return res;
      }
    } catch (err) {
      console.warn('API /iso-signatures/list không khả dụng, sử dụng bộ nhớ cục bộ:', err.message);
    }

    // Fallback filter trên local storage
    let list = getStoredSignatures();

    if (params.signature_type && params.signature_type !== 'all') {
      list = list.filter(i => i.signature_type === params.signature_type);
    }
    if (params.department && params.department !== 'all') {
      list = list.filter(i => i.department === params.department);
    }
    if (params.approval_level && params.approval_level !== 'all') {
      list = list.filter(i => i.approval_level === params.approval_level);
    }
    if (params.is_active && params.is_active !== 'all') {
      const wantActive = params.is_active === 'active' || params.is_active === true || params.is_active === 'true';
      list = list.filter(i => i.is_active === wantActive);
    }
    if (params.keyword && params.keyword.trim()) {
      const kw = params.keyword.toLowerCase().trim();
      list = list.filter(i =>
        (i.full_name || '').toLowerCase().includes(kw) ||
        (i.user_code || '').toLowerCase().includes(kw) ||
        (i.position || '').toLowerCase().includes(kw) ||
        (i.department || '').toLowerCase().includes(kw) ||
        (i.digital_cert_provider || '').toLowerCase().includes(kw)
      );
    }

    return list;
  },

  /**
   * Lấy chi tiết một chữ ký theo ID
   */
  getSignatureDetail: async (id) => {
    try {
      const res = await api.get(`/iso-signatures/${id}`);
      if (res && res.id) return res;
    } catch (err) {
      console.warn(`API /iso-signatures/${id} lỗi, dùng fallback:`, err.message);
    }
    const list = getStoredSignatures();
    const item = list.find(i => String(i.id) === String(id));
    if (!item) throw new Error('Không tìm thấy thông tin chữ ký!');
    return item;
  },

  /**
   * Tạo mới chữ ký
   */
  createSignature: async (payload) => {
    try {
      const res = await api.post('/iso-signatures/create', payload);
      if (res && res.id) {
        const list = getStoredSignatures();
        saveStoredSignatures([res, ...list.filter(x => x.id !== res.id)]);
        return res;
      }
    } catch (err) {
      console.warn('API /iso-signatures/create lỗi, lưu cục bộ:', err.message);
    }

    const list = getStoredSignatures();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newId = list.length > 0 ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
    
    // Nếu đặt là default, bỏ default các chữ ký cùng cấp duyệt/phòng ban nếu cần
    let updatedList = list;
    if (payload.is_default) {
      updatedList = list.map(item => {
        if (item.full_name === payload.full_name) {
          return { ...item, is_default: false };
        }
        return item;
      });
    }

    const newItem = {
      ...payload,
      id: newId,
      created_at: now,
      updated_at: now
    };

    saveStoredSignatures([newItem, ...updatedList]);
    return newItem;
  },

  /**
   * Cập nhật thông tin chữ ký
   */
  updateSignature: async (id, payload) => {
    try {
      const res = await api.put(`/iso-signatures/${id}`, payload);
      if (res && res.id) {
        const list = getStoredSignatures();
        saveStoredSignatures(list.map(x => x.id === res.id ? res : x));
        return res;
      }
    } catch (err) {
      console.warn(`API /iso-signatures/${id} update lỗi, cập nhật cục bộ:`, err.message);
    }

    const list = getStoredSignatures();
    const idx = list.findIndex(x => String(x.id) === String(id));
    if (idx === -1) throw new Error('Không tìm thấy chữ ký cần sửa!');
    
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updated = {
      ...list[idx],
      ...payload,
      updated_at: now
    };

    list[idx] = updated;
    saveStoredSignatures([...list]);
    return updated;
  },

  /**
   * Đổi trạng thái kích hoạt / tạm khóa
   */
  toggleStatus: async (id) => {
    try {
      const res = await api.patch(`/iso-signatures/${id}/toggle-status`);
      if (res) return res;
    } catch (err) {
      console.warn(`API toggle-status lỗi, dùng local:`, err.message);
    }

    const list = getStoredSignatures();
    const item = list.find(x => String(x.id) === String(id));
    if (!item) throw new Error('Không tìm thấy chữ ký!');
    item.is_active = !item.is_active;
    item.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    saveStoredSignatures([...list]);
    return {
      success: true,
      is_active: item.is_active,
      message: item.is_active ? 'Đã kích hoạt chữ ký!' : 'Đã tạm khóa chữ ký!'
    };
  },

  /**
   * Xóa chữ ký
   */
  deleteSignature: async (id) => {
    try {
      const res = await api.delete(`/iso-signatures/${id}`);
      if (res) {
        const list = getStoredSignatures();
        saveStoredSignatures(list.filter(x => String(x.id) !== String(id)));
        return res;
      }
    } catch (err) {
      console.warn(`API delete lỗi, dùng local:`, err.message);
    }

    const list = getStoredSignatures();
    const filtered = list.filter(x => String(x.id) !== String(id));
    saveStoredSignatures(filtered);
    return { success: true, message: 'Đã xóa chữ ký thành công!' };
  },

  /**
   * Tải tệp hình ảnh chữ ký lên máy chủ
   */
  uploadSignatureImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/iso-signatures/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res && res.signature_data) return res;
    } catch (err) {
      console.warn('API upload-image lỗi, chuyển đổi Base64 client-side:', err.message);
    }

    // Client-side FileReader fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          success: true,
          filename: file.name,
          image_path: '',
          signature_data: e.target.result,
          message: 'Tải ảnh thành công (Chế độ xử lý trực tiếp)'
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
};

export default isoSignatureService;
