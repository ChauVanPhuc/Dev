import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import FormInput from '@mobile/Shared/Views/components/form/FormInput';
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import SearchableSelect from '@mobile/Shared/Views/components/form/SearchableSelect';
import { Camera, X, Image as ImageIcon, Check, RotateCcw } from 'lucide-react';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

/**
 * StageInspection Screen
 * Chế độ đa năng: Cho phép chọn loại phiếu kiểm tra và hiển thị Form tương ứng.
 */
const StageInspection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logId, type } = location.state || {};
  const { user } = useAuthStore();
  const [inspectionType, setInspectionType] = useState('dau-vao');
  const [orders, setOrders] = useState([]); // Danh sách PO từ API

  // State quản lý dữ liệu form
  const [formData, setFormData] = useState({
    batch_no: '', // Đây là mã PO
    product_sku: '', // Mã sản phẩm
    total_qty: '0',
    unit: 'Cái',
    supplier: '',
    intended_use: '',
    check_type: 'AQL',
    check_qty: '0',
    results: {
      visual: 'pass',
      size: 'pass',
      function: 'pass',
      conclusion: 'pass'
    },
    notes: '',
    inspection_images: {} // { sectionTitle: [path1, path2...] }
  });

  const [currentProducts, setCurrentProducts] = useState([]); // Danh sách sản phẩm của PO đang chọn
  const [isProductLoading, setIsProductLoading] = useState(false); // Trạng thái tải sản phẩm
  const [isSaving, setIsSaving] = useState(false); // Trạng thái đang lưu dữ liệu

  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await apiClient.get('inspections/stage?limit=50');
      if (Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử kiểm tra:", err);
      // Fallback/Mock history for offline/local testing
      setHistoryList([
        {
          id: 1001,
          inspection_type: 'dau-vao',
          batch_no: 'PO-2026-001',
          product_sku: 'SP-101',
          inspector_name: 'Hồ Sỹ Khẩn',
          conclusion: 'pass',
          inspection_date: '2026-03-01T16:30:00'
        },
        {
          id: 1002,
          inspection_type: 'bam-dinh',
          batch_no: 'PO-2026-002',
          product_sku: 'SP-102',
          inspector_name: 'Hồ Sỹ Khẩn',
          conclusion: 'fail',
          inspection_date: '2026-03-01T16:45:00'
        },
        {
          id: 1003,
          inspection_type: 'sau-dong-goi',
          batch_no: 'PO-2026-003',
          product_sku: 'SP-103',
          inspector_name: 'Hồ Sỹ Khẩn',
          conclusion: 'pass',
          inspection_date: '2026-03-01T17:00:00'
        }
      ]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [inspectionType, logId]);

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      const mappedType = item.inspection_type === 'phu-kien' ? 'dau-vao' : item.inspection_type;
      return mappedType === inspectionType;
    });
  }, [historyList, inspectionType]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} | ${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'dau-vao':
      case 'phu-kien':
        return 'Kiểm tra đầu vào';
      case 'bam-dinh':
        return 'Kiểm tra bám dính';
      case 'sau-dong-goi':
        return 'Kiểm tra sau đóng gói';
      default:
        return 'Kiểm tra công đoạn';
    }
  };

  const handleViewHistoryItem = (item) => {
    navigate('/inspection-stage', { state: { logId: item.id, type: item.inspection_type } });
  };

  // State cho Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });

  // 1. Fetch danh sách PO khi load trang
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get('orders/simple?limit=1000');

        let orderList = [];
        if (Array.isArray(res.data) && res.data.length > 0) {
          orderList = res.data;
        } else {
          orderList = [];
        }

        setOrders(orderList);
      } catch (err) {
        console.error("Lỗi khi tải danh sách PO:", err.message);
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);

  // 1.1 Fetch sản phẩm chi tiết của PO khi thay đổi PO (Lazy Loading)
  useEffect(() => {
    const batch_no = (formData.batch_no || '').trim();
    if (batch_no.length < 3) {
      setCurrentProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setIsProductLoading(true);
      try {
        const res = await apiClient.get(`orders/by-code/${batch_no}/products`);

        const { items = [], products = [] } = res.data;
        // Ưu tiên products (đã phân rã có chi tiết) lên trước items (chưa phân rã)
        const combined = [...products, ...items];
        setCurrentProducts(combined);
      } catch (err) {
        // Chỉ log lỗi nếu không phải là 404 (do đang gõ chưa xong)
        if (err.response?.status !== 404) {
          console.error("Lỗi khi tải sản phẩm:", err.message);
        }
        setCurrentProducts([]);
      } finally {
        setIsProductLoading(false);
      }
    };
    fetchProducts();
  }, [formData.batch_no]);

  // 1.2 Tự động chọn sản phẩm đầu tiên khi danh sách sản phẩm được tải
  useEffect(() => {
    if (currentProducts.length > 0) {
      const firstProd = currentProducts[0];
      // Chỉ tự động chọn nếu chưa có giá trị hoặc giá trị cũ không còn hợp lệ
      const isValid = currentProducts.some(p => p.sku === formData.product_sku);
      if (!formData.product_sku || !isValid) {
        setFormData(prev => ({ ...prev, product_sku: firstProd.sku, detail_bam_dinh: '' }));
      }
    } else {
      // Reset khi PO đổi
      setFormData(prev => ({ ...prev, product_sku: '', detail_bam_dinh: '' }));
    }
  }, [currentProducts]);

  // 2. Chuyển đổi danh sách sản phẩm hiện tại sang format của dropdown
  const productOptions = useMemo(() => {
    if (isProductLoading) return [{ label: 'Đang tải...', value: '' }];
    if (currentProducts.length === 0) return [{ label: 'Nhập mã PO trước', value: '' }];

    return currentProducts.map(p => ({ label: p.sku, value: p.sku }));
  }, [currentProducts, isProductLoading]);

  // 3. Danh sách chi tiết (Elements) đi theo sản phẩm đang chọn
  const detailOptions = useMemo(() => {
    const selectedProd = currentProducts.find(p => p.sku === formData.product_sku);
    
    if (!formData.product_sku) {
      return [{ label: 'Chọn sản phẩm trước', value: '' }];
    }

    if (!selectedProd || !selectedProd.elements || selectedProd.elements.length === 0) {
      return [{ label: 'Không có chi tiết (Mặc định)', value: formData.product_sku }];
    }
    
    return selectedProd.elements.map(e => ({ label: e.name || e.sku, value: e.name || e.sku }));
  }, [formData.product_sku, currentProducts]);

  // Tự động chọn chi tiết đầu tiên khi đổi sản phẩm
  useEffect(() => {
    if (detailOptions.length > 0 && detailOptions[0].value) {
      // Kiểm tra xem giá trị hiện tại có nằm trong danh sách mới không
      const isValid = detailOptions.some(opt => opt.value === formData.detail_bam_dinh);
      if (!formData.detail_bam_dinh || !isValid) {
        setFormData(prev => ({ ...prev, detail_bam_dinh: detailOptions[0].value }));
      }
    }
  }, [formData.product_sku, detailOptions]);

  const handleFieldChange = (field, value) => {
    // Chỉ cho phép số dương cho các trường số lượng
    if (field === 'total_qty' || field === 'check_qty') {
      let numericValue = value.replace(/[^0-9]/g, '');

      // Bỏ số 0 ở đầu (nếu có nhiều hơn 1 chữ số)
      if (numericValue.length > 1 && numericValue.startsWith('0')) {
        numericValue = numericValue.replace(/^0+/, '');
      }

      // Giới hạn tối đa 999,999
      if (numericValue && parseInt(numericValue, 10) > 999999) {
        numericValue = '999999';
      }

      setFormData(prev => ({ ...prev, [field]: numericValue || '0' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleResultChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      results: { ...prev.results, [key]: value }
    }));
  };

  useEffect(() => {
    if (type) {
      const lowerType = type.toLowerCase();
      if (lowerType.includes('phụ kiện') || lowerType.includes('đầu vào')) setInspectionType('dau-vao');
      else if (lowerType.includes('bám dính')) setInspectionType('bam-dinh');
      else if (lowerType.includes('đóng gói')) setInspectionType('sau-dong-goi');
    }
  }, [type]);

  // 1.2 Fetch dữ liệu cũ nếu đang ở chế độ chỉnh sửa, hoặc reset nếu không có logId
  useEffect(() => {
    if (!logId) {
      setFormData({
        batch_no: '',
        product_sku: '',
        total_qty: '0',
        unit: 'Cái',
        supplier: '',
        intended_use: '',
        check_type: 'Định hình',
        check_qty: '0',
        detail_bam_dinh: '',
        results: {
          visual: 'pass',
          size: 'pass',
          function: 'pass',
          conclusion: 'pass'
        },
        notes: '',
        inspection_images: {}
      });
      return;
    }

    const fetchOldData = async () => {
      try {
        const res = await apiClient.get(`inspections/stage/${logId}`);
        if (res.data) {
          const item = res.data;

          // Xử lý an toàn cho data_json và images_json (phòng trường hợp đã được parse bởi interceptor)
          let extra = {};
          try {
            extra = typeof item.data_json === 'string' ? JSON.parse(item.data_json) : (item.data_json || {});
          } catch (e) { extra = {}; }

          let images = {};
          try {
            images = typeof item.images_json === 'string' ? JSON.parse(item.images_json) : (item.images_json || {});
          } catch (e) { images = {}; }

          setFormData({
            batch_no: item.batch_no || '',
            product_sku: item.product_sku || '',
            total_qty: extra.total_qty || '0',
            unit: extra.unit || 'Cái',
            supplier: extra.supplier || '',
            intended_use: extra.intended_use || '',
            check_type: extra.check_type || 'Định hình',
            check_qty: extra.check_qty || '0',
            detail_bam_dinh: extra.detail_bam_dinh || '',
            results: {
              visual: extra.visual || 'pass',
              size: extra.size || 'pass',
              function: extra.function || 'pass',
              conclusion: item.conclusion || 'pass'
            },
            notes: item.notes || '',
            inspection_images: images
          });

          if (item.inspection_type) {
            // Map giá trị cũ 'phu-kien' sang 'dau-vao'
            const mappedType = item.inspection_type === 'phu-kien' ? 'dau-vao' : item.inspection_type;
            setInspectionType(mappedType);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu cũ:", err);
      }
    };
    fetchOldData();
  }, [logId]);

  const inspectionOptions = [
    { label: 'Phiếu kiểm tra đầu vào', value: 'dau-vao' },
    { label: 'Kiểm tra bám dính', value: 'bam-dinh' },
    { label: 'Kiểm tra sau đóng gói', value: 'sau-dong-goi' },
  ];

  const RadioResult = ({ label, value, onChange, readOnly }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
      <span style={{ flex: 1, fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="radio"
            checked={value === 'pass'}
            onChange={() => !readOnly && onChange && onChange('pass')}
            disabled={readOnly}
            style={{ accentColor: '#22c55e', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: '700' }}>Đạt</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: readOnly ? 'default' : 'pointer' }}>
          <input
            type="radio"
            checked={value === 'fail'}
            onChange={() => !readOnly && onChange && onChange('fail')}
            disabled={readOnly}
            style={{ accentColor: '#ef4444', width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '700' }}>Chưa Đạt</span>
        </label>
      </div>
    </div>
  );

  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState(null);

  const handleCapture = (sectionTitle) => {
    setActiveSection(sectionTitle);
    fileInputRef.current.click();
  };

  const onFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSaving(true);
    try {
      const uploadFormData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadFormData.append('files', files[i]);
      }

      const res = await apiClient.post('inspections/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.paths) {
        const newPaths = res.data.paths;
        setFormData(prev => {
          const currentImages = prev.inspection_images[activeSection] || [];
          return {
            ...prev,
            inspection_images: {
              ...prev.inspection_images,
              [activeSection]: [...currentImages, ...newPaths]
            }
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải ảnh:", err);
      alert("Không thể tải ảnh lên máy chủ.");
    } finally {
      setIsSaving(false);
      e.target.value = ''; // Reset input
    }
  };

  const removeImage = (sectionTitle, pathToRemove) => {
    setFormData(prev => ({
      ...prev,
      inspection_images: {
        ...prev.inspection_images,
        [sectionTitle]: (prev.inspection_images[sectionTitle] || []).filter(p => p !== pathToRemove)
      }
    }));
  };

  const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
  };

  const ImageSection = ({ title }) => {

    const normalizedTitle = title.trim();

    let images = [];



    if (Array.isArray(formData.inspection_images)) {

      images = formData.inspection_images;

    } else if (formData.inspection_images && typeof formData.inspection_images === 'object') {

      images = formData.inspection_images[normalizedTitle] || [];



      // Fallback 1: Tìm key gần giống nhất bằng cách loại bỏ dấu tiếng Việt

      if (images.length === 0) {

        const searchKey = removeVietnameseTones(normalizedTitle);

        const allKeys = Object.keys(formData.inspection_images);

        const similarKey = allKeys.find(k => removeVietnameseTones(k) === searchKey || removeVietnameseTones(k).includes(searchKey));

        if (similarKey) {

          images = formData.inspection_images[similarKey] || [];

        }

      }



      // Fallback 2: Nếu loại kiểm tra không phải sau-dong-goi (chỉ có 1 phần ảnh duy nhất)

      if (images.length === 0 && inspectionType !== 'sau-dong-goi') {

        const allValues = Object.values(formData.inspection_images);

        images = allValues.flat().filter(Boolean);

      }



      // Fallback 3: Khớp dựa trên từ khóa (đối phó với lỗi mã hóa hiển thị dấu hỏi "?" từ SQL Server)

      if (images.length === 0) {

        const allKeys = Object.keys(formData.inspection_images);

        let matchedKey = null;

        const lowerTitle = normalizedTitle.toLowerCase();



        if (lowerTitle.includes('quy trình') || lowerTitle.includes('quy trinh')) {

          matchedKey = allKeys.find(k => k.toLowerCase().includes('quy tr') || k.toLowerCase().includes('dong goi') || k.toLowerCase().includes('dóng gói'));

        } else if (lowerTitle.includes('tem') || lowerTitle.includes('nhãn') || lowerTitle.includes('nhan')) {

          matchedKey = allKeys.find(k => k.toLowerCase().includes('tem') || k.toLowerCase().includes('nhan') || k.toLowerCase().includes('nhãn'));

        } else if (lowerTitle.includes('khác') || lowerTitle.includes('khac')) {

          matchedKey = allKeys.find(k => k.toLowerCase().includes('khac') || k.toLowerCase().includes('khác'));

        } else if (lowerTitle.includes('kiểm tra') || lowerTitle.includes('kiem tra')) {

          matchedKey = allKeys.find(k => k.toLowerCase().includes('kiem') || k.toLowerCase().includes('kiểm') || k.toLowerCase().includes('tra') || k.toLowerCase().includes('?nh'));

        }



        if (matchedKey) {

          images = formData.inspection_images[matchedKey] || [];

        }

      }

    }



    if (logId && images.length === 0) return null; // Ẩn hoàn toàn nếu xem log mà không có ảnh

    return (
      <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', marginBottom: '12px' }}>{title}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {images.map((path, idx) => (
            <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
              <img
                src={`${apiClient.defaults.baseURL.split('/api/v1')[0]}${path}`}
                alt="Captured"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
              />
              {!logId && (
                <button
                  onClick={() => removeImage(title, path)}
                  style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          {!logId && (
            <div
              onClick={() => handleCapture(title)}
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Camera size={28} color="#94a3b8" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFormContent = () => {
    switch (inspectionType) {
      case 'dau-vao':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <FormInput
                  label="PO"
                  value={formData.batch_no}
                  onChange={(e) => handleFieldChange('batch_no', e.target.value)}
                  placeholder="Nhập mã PO"
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Số lượng"
                  value={formData.total_qty}
                  onChange={(e) => handleFieldChange('total_qty', e.target.value)}
                  inputStyle={{ textAlign: 'center' }}
                  readOnly={!!logId}
                />
              </div>
              <div style={{ width: '100px' }}>
                <FormSelect
                  label="Đơn vị"
                  value={formData.unit}
                  options={[
                    { label: 'Cái', value: 'Cái' },
                    { label: 'bộ', value: 'bộ' },
                    { label: 'pallet', value: 'pallet' }
                  ]}
                  onChange={(e) => handleFieldChange('unit', e.target.value)}
                  readOnly={!!logId}
                />
              </div>
            </div>
            <FormInput
              label="Nhà cung cấp"
              value={formData.supplier}
              onChange={(e) => handleFieldChange('supplier', e.target.value)}
              placeholder="Nhập tên nhà cung cấp (VD: Long Thanh wood)"
              readOnly={!!logId}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Sản phẩm"
                  value={formData.product_sku}
                  onChange={(e) => handleFieldChange('product_sku', e.target.value)}
                  placeholder="Nhập mã SP"
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Chi tiết"
                  value={formData.detail_bam_dinh}
                  onChange={(e) => handleFieldChange('detail_bam_dinh', e.target.value)}
                  placeholder="Tên chi tiết"
                  readOnly={!!logId}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Loại kiểm"
                  value={formData.check_type}
                  onChange={(e) => handleFieldChange('check_type', e.target.value)}
                  placeholder="VD: Định hình"
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="SL kiểm"
                  value={formData.check_qty}
                  onChange={(e) => handleFieldChange('check_qty', e.target.value)}
                  inputStyle={{ textAlign: 'center' }}
                  readOnly={!!logId}
                />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div id="stage-results-group" style={{ display: 'flex', flexDirection: 'column' }}>
              <RadioResult label="Ngoại quan:" value={formData.results.visual} onChange={(val) => handleResultChange('visual', val)} readOnly={!!logId} />
              <RadioResult label="Kích thước:" value={formData.results.size} onChange={(val) => handleResultChange('size', val)} readOnly={!!logId} />
              <RadioResult label="Chức năng:" value={formData.results.function} onChange={(val) => handleResultChange('function', val)} readOnly={!!logId} />
              <RadioResult label="Kết luận:" value={formData.results.conclusion} onChange={(val) => handleResultChange('conclusion', val)} readOnly={!!logId} />
            </div>
          </div>
        );

      case 'bam-dinh':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <SearchableSelect
                  label="PO"
                  value={formData.batch_no}
                  options={orders.map(o => ({ label: o.order_code, value: o.order_code }))}
                  onChange={(e) => handleFieldChange('batch_no', e.target.value)}
                  placeholder="Tìm mã PO..."
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput label="Người nhập" value={user?.full_name || 'Người kiểm tra'} readOnly={true} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <FormSelect
                  label="Sản phẩm"
                  value={formData.product_sku}
                  onChange={(e) => handleFieldChange('product_sku', e.target.value)}
                  options={productOptions}
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormSelect
                  label="Chi tiết"
                  value={formData.detail_bam_dinh}
                  onChange={(e) => handleFieldChange('detail_bam_dinh', e.target.value)}
                  options={detailOptions}
                  readOnly={!!logId}
                />
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div id="stage-results-group">
              <RadioResult
                label="Kết luận:"
                value={formData.results.conclusion}
                onChange={(val) => handleResultChange('conclusion', val)}
                readOnly={!!logId}
              />
            </div>
          </div>
        );

      case 'sau-dong-goi':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <SearchableSelect
                  label="PO"
                  value={formData.batch_no}
                  options={orders.map(o => ({ label: o.order_code, value: o.order_code }))}
                  onChange={(e) => handleFieldChange('batch_no', e.target.value)}
                  placeholder="Tìm mã PO..."
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput label="Người nhập" value={user?.full_name || 'Người kiểm tra'} readOnly={true} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <FormSelect
                  label="Sản phẩm"
                  value={formData.product_sku}
                  onChange={(e) => handleFieldChange('product_sku', e.target.value)}
                  options={productOptions}
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormSelect
                  label="Chi tiết"
                  value={formData.detail_bam_dinh}
                  onChange={(e) => handleFieldChange('detail_bam_dinh', e.target.value)}
                  options={detailOptions}
                  readOnly={!!logId}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Công đoạn"
                  value={formData.check_type || 'Đóng gói'}
                  onChange={(e) => handleFieldChange('check_type', e.target.value)}
                  readOnly={!!logId}
                />
              </div>
              <div style={{ flex: 1 }}></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

            <ImageSection title="Quy trình đóng gói" />
            <ImageSection title="Tem nhãn sau đóng gói" />
            <ImageSection title="Ảnh khác" />

            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
            <div id="stage-results-group">
              <RadioResult
                label="Kết luận:"
                value={formData.results.conclusion}
                onChange={(val) => handleResultChange('conclusion', val)}
                readOnly={!!logId}
              />
            </div>
          </div>
        );


      default:
        return null;
    }
  };

  const handleValidateAndConfirm = () => {
    if (!formData.batch_no.trim()) {
      setMessageConfig({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập mã PO!' });
      setIsMessageOpen(true);
      return;
    }
    if (!formData.product_sku.trim()) {
      setMessageConfig({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập mã Sản phẩm!' });
      setIsMessageOpen(true);
      return;
    }
    if ((inspectionType === 'dau-vao' || inspectionType === 'bam-dinh') && !formData.detail_bam_dinh.trim()) {
      setMessageConfig({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng chọn Chi tiết!' });
      setIsMessageOpen(true);
      return;
    }
    if (inspectionType === 'dau-vao' && !formData.supplier.trim()) {
      setMessageConfig({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng nhập tên Nhà cung cấp!' });
      setIsMessageOpen(true);
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      // Chuẩn bị dữ liệu đặc thù theo loại phiếu
      const extraData = { ...formData.results };
      if (inspectionType === 'dau-vao') {
        extraData.supplier = formData.supplier;
        extraData.check_type = formData.check_type;
        extraData.detail_bam_dinh = formData.detail_bam_dinh;
      } else if (inspectionType === 'bam-dinh') {
        extraData.detail_bam_dinh = formData.detail_bam_dinh;
      }

      const payload = {
        inspection_type: inspectionType,
        batch_no: formData.batch_no,
        product_sku: formData.product_sku,
        inspector_name: user?.full_name || "Người kiểm tra",
        conclusion: formData.results.conclusion || 'pass',
        notes: formData.notes,
        data_json: JSON.stringify(extraData),
        images_json: JSON.stringify(formData.inspection_images)
      };

      await apiClient.post('inspections/stage', payload);
      setMessageConfig({
        type: 'success',
        title: 'Thành công',
        message: 'Lưu phiếu kiểm tra công đoạn thành công!'
      });
      setIsMessageOpen(true);
    } catch (err) {
      console.error("Lỗi khi lưu phiếu:", err);
      setMessageConfig({
        type: 'error',
        title: 'Thất bại',
        message: 'Có lỗi xảy ra khi lưu phiếu. Vui lòng thử lại!'
      });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          title="G7 - Smart Flow"
          subTitle={logId ? `MB6 | Cập nhật phiếu #${logId}` : "MB6 | Phiếu kiểm tra theo công đoạn"}
        />

        <div style={{ padding: '16px' }}>
          {logId && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => navigate('/inspection-stage', { state: null })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#4b301e',
                  border: '1px solid #4b301e',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                + Tạo phiếu mới
              </button>
            </div>
          )}

          <div id="stage-type-select" style={{ marginBottom: '20px' }}>
            <FormSelect
              label="Chọn phiếu kiểm tra"
              value={inspectionType}
              options={inspectionOptions}
              onChange={e => setInspectionType(e.target.value)}
              readOnly={!!logId}
            />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            multiple
          />

          <div id="stage-form-card">
            <CollapsibleCard title={`Kiểm tra ngày ${new Date().toLocaleDateString('vi-VN')}`} defaultOpen={true}>
              {renderFormContent()}

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Ghi chú</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Nhập ghi chú"
                  readOnly={!!logId}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    color: !!logId ? '#94a3b8' : '#1e293b', 
                    backgroundColor: !!logId ? '#f8fafc' : '#fff',
                    cursor: !!logId ? 'not-allowed' : 'text',
                    resize: 'none', 
                    outline: 'none' 
                  }}
                />
              </div>

              {/* Ảnh kiểm tra đặt ở cuối cùng */}
              {inspectionType !== 'sau-dong-goi' && <ImageSection title="Ảnh kiểm tra" />}
            </CollapsibleCard>
          </div>

          {/* History Log Section */}
          <div style={{ marginTop: '24px', backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #e8e1d5', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#4b301e', marginBottom: '16px' }}>Lịch sử kiểm tra gần đây</h3>
            {isHistoryLoading ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Đang tải lịch sử...</div>
            ) : filteredHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleViewHistoryItem(item)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      backgroundColor: '#fdfbf7',
                      borderRadius: '12px',
                      border: '1px solid #f0ede8',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7f4ee'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fdfbf7'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>
                        {getTypeName(item.inspection_type)} ({item.batch_no || 'N/A'})
                      </span>
                      <span style={{ fontSize: '11px', color: '#7c6d5e' }}>
                        SP: {item.product_sku || 'N/A'} - Kết luận: <span style={{ fontWeight: '700', color: item.conclusion === 'pass' ? '#22c55e' : '#ef4444' }}>{item.conclusion.toUpperCase()}</span>
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#a3978b', fontWeight: '500' }}>
                      {formatDateTime(item.inspection_date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px', fontStyle: 'italic' }}>
                Không có lịch sử kiểm tra cho công đoạn này.
              </div>
            )}
          </div>
        </div>

        <div className="responsive-fixed-footer" style={{ backgroundColor: '#f8f4f0', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 100 }}>
          {logId ? (
            <button
              onClick={() => navigate(-1)}
              style={{
                flex: 1,
                backgroundColor: '#4b301e',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={20} /> Quay lại
            </button>
          ) : (
            <>
              <button
                id="stage-submit-btn"
                disabled={isSaving}
                onClick={handleValidateAndConfirm}
                style={{
                  flex: 1,
                  backgroundColor: isSaving ? '#94a3b8' : '#4b301e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {isSaving ? 'Đang lưu...' : <><Check size={20} /> Xác nhận</>}
              </button>
              <button
                onClick={() => navigate(-1)}
                style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <RotateCcw size={20} /> Hủy
              </button>
            </>
          )}
        </div>

        {/* Custom Modals */}
        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Xác nhận lưu"
          message="Bạn có chắc chắn muốn lưu phiếu kiểm tra này không?"
          onConfirm={handleSave}
          onCancel={() => setIsConfirmOpen(false)}
        />

        <MessageModal
          isOpen={isMessageOpen}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
          onConfirm={() => {
            setIsMessageOpen(false);
            if (messageConfig.type === 'success') {
              navigate('/plan'); // Quay về trang MHC (Plan Tracking)
            }
          }}
        />
      </div>
    </Layout>
  );
};

export default StageInspection;
