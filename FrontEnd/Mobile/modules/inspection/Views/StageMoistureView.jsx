import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import InspectionDetailPopup, { formatDateTime } from './components/InspectionDetailPopup';
import { Camera, X, Image as ImageIcon, Check, RotateCcw, Search, Plus, Pencil, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

const initializeDefaultSamples = (qty) => {
  return Array.from({ length: qty }, (_, i) => ({
    stt: i + 1,
    moisture: { values: [], photo: null },
    result: 'untested'
  }));
};

const StageMoistureView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [orders, setOrders] = useState([]);

  // Search & suggestions
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [recentPOs, setRecentPOs] = useState([]);
  const [isPoSearching, setIsPoSearching] = useState(false);
  const [poNotFound, setPoNotFound] = useState(false);
  const [showPoSuggestions, setShowPoSuggestions] = useState(false);
  const [isPoFocused, setIsPoFocused] = useState(false);

  // Loaded PO details
  const [poHeader, setPoHeader] = useState(null);
  const [poItems, setPoItems] = useState([]);

  // Selected product & measurements
  const [selectedItem, setSelectedItem] = useState(null);
  const [inspectedQty, setInspectedQty] = useState('');
  const [failedQty, setFailedQty] = useState(0);
  const [sampleQty, setSampleQty] = useState(3);
  const [samples, setSamples] = useState(initializeDefaultSamples(3));
  const [itemNotes, setItemNotes] = useState('');
  const [activeParameter, setActiveParameter] = useState('moisture');

  // Photo modal popup states
  const [activeSampleIndex, setActiveSampleIndex] = useState(null);
  const [activeModalType, setActiveModalType] = useState(null); // 'moisture' | 'size' | 'visual' | 'functional' | null
  const [singleValue, setSingleValue] = useState('');
  const [singlePhoto, setSinglePhoto] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [allowManualInput, setAllowManualInput] = useState(true);

  // States for dynamic parameter popup inputs
  const [modalValues, setModalValues] = useState([]);
  const [sizeThickness, setSizeThickness] = useState('');
  const [sizeWidth, setSizeWidth] = useState('');
  const [sizeLength, setSizeLength] = useState('');
  const [sizeTab, setSizeTab] = useState('thickness'); // 'thickness' | 'width' | 'length'

  const modalFileInputRef = useRef(null);

  // Fetch Daily History
  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const res = await apiClient.get(`inspections/stage?month=${month}&year=${year}&limit=200`);
      if (Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử kiểm tra:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const saved = JSON.parse(localStorage.getItem('recent_stage_po_searches') || '[]');
    setRecentPOs(saved);

    const fetchPOs = async () => {
      try {
        const res = await apiClient.get('orders/?limit=200');
        if (Array.isArray(res.data)) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải PO KHSX:", err);
      }
    };
    fetchPOs();
  }, []);

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => ['do-am', 'kich-thuoc', 'ngoai-quan', 'chuc-nang', 'cong-doan'].includes(item.inspection_type)).slice(0, 3);
  }, [historyList]);

  const filteredPOs = useMemo(() => {
    if (!poSearchTerm) return orders;
    const term = poSearchTerm.toLowerCase().trim();
    return orders.filter(o =>
      (o.order_code || '').toLowerCase().includes(term) ||
      (o.customer || '').toLowerCase().includes(term)
    );
  }, [orders, poSearchTerm]);

  // Load PO directly on search
  const handleSearchPO = async (codeOverride) => {
    const searchCode = (codeOverride || poSearchTerm).trim().toUpperCase();
    if (!searchCode) return;
    setIsPoSearching(true);
    setPoNotFound(false);
    try {
      let supplierName = 'N/A';
      let supplierCode = '';
      let orderDate = '';
      let deliveryDate = '';

      // 1. Fetch Order Header details
      let order = null;
      try {
        const resHeader = await apiClient.get(`orders/code/${searchCode}`);
        order = resHeader.data;
      } catch (hErr) { }

      const aggregated = {};
      const addPart = (code, name, qty, opts = {}) => {
        const key = (name || code || '').trim();
        if (!key) return;

        const nameLower = key.toLowerCase();
        if (opts.is_raw_material ||
          opts.exclude_production ||
          nameLower.startsWith('ván') ||
          nameLower.includes('veneer') ||
          nameLower.includes('mdf') ||
          nameLower.includes('hmr')) {
          return;
        }

        if (!aggregated[key]) {
          aggregated[key] = {
            item_code: code || name || '',
            item_name: name || code || '',
            quantity: qty || 0,
            unit: 'cái'
          };
        } else {
          aggregated[key].quantity = Math.max(aggregated[key].quantity, qty || 0);
        }
      };

      // A. Load from PO Items (Excel PurchaseOrderItems)
      try {
        const resItems = await apiClient.get(`purchase-order-items/by-po/${searchCode}`);
        if (resItems.data && Array.isArray(resItems.data)) {
          resItems.data.forEach(it => {
            addPart(it.item_code, it.item_name, it.quantity || 0, {
              is_raw_material: it.is_raw_material,
              exclude_production: it.exclude_production
            });
          });
          if (resItems.data.length > 0) {
            supplierCode = resItems.data[0].supplier_code || '';
            supplierName = resItems.data[0].supplier_name || '';
            orderDate = resItems.data[0].po_date || '';
            deliveryDate = resItems.data[0].requested_delivery_date || '';
          }
        }
      } catch (err) {
        console.log('No purchase order items:', err);
      }

      // B. Load from PO products BOM (Cabinet products)
      try {
        const resProducts = await apiClient.get(`orders/by-code/${searchCode}/products`);
        const productsData = resProducts.data || {};
        if (Array.isArray(productsData.products)) {
          productsData.products.forEach(p => {
            addPart(p.sku, p.name, p.quantity || 0);
          });
        }
        if (Array.isArray(productsData.items)) {
          productsData.items.forEach(it => {
            addPart(it.sku, it.name, it.quantity || 0);
          });
        }
      } catch (prodErr) {
        console.error('Lỗi khi tải danh sách sản phẩm BOM:', prodErr);
      }

      const mergedItems = Object.values(aggregated).map((it, idx) => ({
        id: `po_item_${idx}_${Date.now()}`,
        ...it
      }));

      if (mergedItems.length === 0) {
        setPoNotFound(true);
        setPoItems([]);
        setPoHeader(null);
        setSelectedItem(null);
        setIsPoSearching(false);
        return;
      }

      const headerInfo = {
        po_code: searchCode,
        supplier_code: supplierCode,
        supplier_name: order?.customer || supplierName || 'N/A',
        order_date: order?.create_date || orderDate || '',
        delivery_date: order?.estimated_date || deliveryDate || ''
      };

      setPoHeader(headerInfo);
      setPoItems(mergedItems);
      setSelectedItem(mergedItems[0]);
      const initialQty = mergedItems[0].quantity || 0;
      setInspectedQty(initialQty);
      setFailedQty(0);
      setSamples(initializeDefaultSamples(3));
      setSampleQty(3);

      // Save history search
      let list = JSON.parse(localStorage.getItem('recent_stage_po_searches') || '[]');
      list = [searchCode, ...list.filter(x => x !== searchCode)].slice(0, 5);
      localStorage.setItem('recent_stage_po_searches', JSON.stringify(list));
      setRecentPOs(list);
    } catch (err) {
      console.error("Lỗi khi tìm PO:", err);
      setPoNotFound(true);
    } finally {
      setIsPoSearching(false);
    }
  };

  const handleUpdateSampleQty = (newQty) => {
    if (newQty < 1 || newQty > 10) return;
    setSampleQty(newQty);
    setSamples(prev => {
      if (newQty > prev.length) {
        const extra = Array.from({ length: newQty - prev.length }, (_, i) => ({
          stt: prev.length + i + 1,
          moisture: { values: [], photo: null },
          result: 'untested'
        }));
        return [...prev, ...extra];
      } else {
        const sliced = prev.slice(0, newQty);
        const failCount = sliced.filter(s => s.result === 'fail').length;
        setFailedQty(failCount);
        return sliced;
      }
    });
  };

  const handleToggleRowResult = (idx) => {
    setSamples(prev => {
      const next = [...prev];
      const cur = next[idx].result;
      let nextRes = 'untested';
      if (cur === 'untested') nextRes = 'pass';
      else if (cur === 'pass') nextRes = 'fail';
      else nextRes = 'untested';
      next[idx].result = nextRes;

      const failCount = next.filter(s => s.result === 'fail').length;
      setFailedQty(failCount);
      return next;
    });
  };

  const handleOpenPhotoModal = (idx, type) => {
    setActiveSampleIndex(idx);
    setActiveModalType(type);
    setIsOcrProcessing(false);
    setIsUploadingImage(false);

    const sample = samples[idx];
    if (type === 'moisture') {
      const vals = sample.moisture?.values || [];
      setModalValues(vals);
      setSingleValue(vals[vals.length - 1] || '');
      setSinglePhoto(sample.moisture?.photo || '');
    } else if (type === 'size') {
      setSizeThickness(sample.size?.thickness || '');
      setSizeWidth(sample.size?.width || '');
      setSizeLength(sample.size?.length || '');
      setSinglePhoto(sample.size?.photo || '');
      setSizeTab('thickness');
    } else {
      // visual or functional
      const vals = sample[type]?.values || [];
      setModalValues(vals);
      setSingleValue(vals[vals.length - 1] || '');
      setSinglePhoto(sample[type]?.photo || '');
    }
  };


  const onModalFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const localUrl = URL.createObjectURL(file);
    setSinglePhoto(localUrl);

    setIsUploadingImage(true);
    setIsOcrProcessing(true);
    setAllowManualInput(false);

    try {
      // 1. Upload photo to server
      const uploadFormData = new FormData();
      uploadFormData.append('files', file);
      const uploadRes = await apiClient.post('inspections/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      let serverPath = '';
      if (uploadRes.data && uploadRes.data.paths && uploadRes.data.paths.length > 0) {
        serverPath = uploadRes.data.paths[0];
        setSinglePhoto(serverPath);
      }

      // 2. Run OCR
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);
      const ocrRes = await apiClient.post('inspections/upload-ocr', ocrFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 35000
      });

      if (ocrRes.data && ocrRes.data.value !== undefined && ocrRes.data.value !== null) {
        const ocrVal = String(ocrRes.data.value);
        if (activeModalType === 'size') {
          if (sizeTab === 'thickness') setSizeThickness(ocrVal);
          else if (sizeTab === 'width') setSizeWidth(ocrVal);
          else if (sizeTab === 'length') setSizeLength(ocrVal);
        } else {
          setSingleValue(ocrVal);
        }
        setAllowManualInput(true);
      } else {
        alert("Không nhận diện được số đo từ ảnh. Vui lòng nhập thủ công!");
      }
    } catch (err) {
      console.error("Lỗi OCR/Upload:", err);
      alert("Lỗi kết nối AI Vision. Vui lòng tự nhập trị số!");
      setAllowManualInput(true);
    } finally {
      setIsUploadingImage(false);
      setIsOcrProcessing(false);
      e.target.value = '';
    }
  };

  const handleConfirmModalValues = () => {
    const next = [...samples];
    const sample = next[activeSampleIndex];

    if (activeModalType === 'size') {
      const thicknessVal = parseFloat(String(sizeThickness || '').replace(',', '.')) || 0;
      const widthVal = parseFloat(String(sizeWidth || '').replace(',', '.')) || 0;
      const lengthVal = parseFloat(String(sizeLength || '').replace(',', '.')) || 0;

      next[activeSampleIndex] = {
        ...sample,
        size: {
          thickness: thicknessVal,
          width: widthVal,
          length: lengthVal,
          photo: singlePhoto
        },
        // For size: if thickness, width, and length are measured, mark as 'pass'
        result: (thicknessVal > 0 && widthVal > 0 && lengthVal > 0) ? 'pass' : 'fail'
      };
    } else {
      // moisture, visual, or functional
      const valStr = String(singleValue || '').trim();
      if (valStr === '' && modalValues.length === 0) {
        alert("Vui lòng nhập thông số hoặc chụp ảnh đo!");
        return;
      }

      // If they typed a value but haven't clicked "+ Đo thêm", add it
      let finalValues = [...modalValues];
      if (valStr !== '') {
        const parts = valStr.split('|').map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          const replaced = p.replace(',', '.');
          const val = parseFloat(replaced);
          if (!isNaN(val)) {
            finalValues.push(val);
          } else {
            finalValues.push(p);
          }
        });
      }

      // Unique numeric check
      const numericValues = finalValues.filter(v => typeof v === 'number' || !isNaN(parseFloat(v))).map(v => parseFloat(v));
      const isAllNumeric = finalValues.length === numericValues.length;

      let result = 'untested';
      if (activeModalType === 'moisture') {
        result = (isAllNumeric && numericValues.length > 0 && numericValues.every(v => v >= 8 && v <= 12)) ? 'pass' : 'fail';
      } else {
        result = finalValues.length > 0 ? 'pass' : 'untested';
      }

      next[activeSampleIndex] = {
        ...sample,
        [activeModalType]: {
          values: finalValues,
          photo: singlePhoto
        },
        result: result
      };
    }

    const failCount = next.filter(s => s.result === 'fail').length;
    setFailedQty(failCount);
    setSamples(next);
    setActiveModalType(null);
  };

  const handleSubmitInspection = async () => {
    if (!poHeader || !selectedItem) {
      alert("Vui lòng chọn PO và sản phẩm cần kiểm tra!");
      return;
    }

    setIsSaving(true);
    try {
      const allImages = [];
      samples.forEach(s => {
        if (s.moisture?.photo) allImages.push(s.moisture.photo);
      });

      const overallConclusion = (failedQty > 0 || samples.some(s => s.result === 'fail')) ? 'fail' : 'pass';

      const paramToTypeMap = {
        moisture: 'do-am',
        size: 'kich-thuoc',
        visual: 'ngoai-quan',
        functional: 'chuc-nang'
      };

      const stageMap = {
        moisture: 'Phôi gỗ',
        size: 'Định hình',
        visual: 'Lắp ráp',
        functional: 'Thành phẩm'
      };

      const stageName = stageMap[activeParameter] || 'Phôi gỗ';
      const calcFailedQty = parseInt(failedQty) || samples.filter(s => s.result === 'fail').length;

      // Tự tạo danh sách lỗi để đồng bộ tự động vào Ghi nhận lỗi hàng ngày
      const defectsList = [];
      if (overallConclusion === 'fail' || calcFailedQty > 0) {
        let defectId = 108; // Gỗ cao ẩm
        let defectName = 'Gỗ cao ẩm';
        if (activeParameter === 'size') {
          defectId = 131; // Sai kích thước
          defectName = 'Sai kích thước';
        } else if (activeParameter === 'visual') {
          defectId = 208; // Nứt tét
          defectName = 'Nứt tét';
        }

        defectsList.push({
          defect_id: defectId,
          defect_name: defectName,
          quantity: calcFailedQty > 0 ? calcFailedQty : 1
        });
      }

      const payload = {
        inspection_type: paramToTypeMap[activeParameter] || 'do-am',
        batch_no: poHeader.po_code,
        product_sku: selectedItem.item_code,
        inspector_name: user?.full_name || "Người kiểm tra",
        conclusion: overallConclusion,
        notes: itemNotes,
        data_json: JSON.stringify({
          po_code: poHeader.po_code,
          product_sku: selectedItem.item_code,
          product_name: selectedItem.item_name,
          total_qty: selectedItem.quantity || 0,
          sample_qty: samples.length,
          is_wood: true,
          stage: stageName,
          defects: defectsList,
          action: overallConclusion === 'pass' ? 'luu-kho' : 'tra-ve',
          samples: samples,
          inspected_qty: parseInt(inspectedQty) || 0,
          failed_qty: calcFailedQty
        }),
        images_json: JSON.stringify({ "Ảnh kiểm tra": allImages })
      };

      await apiClient.post('inspections/stage', payload);

      setMessageConfig({ type: 'success', title: 'Thành công', message: 'Đã lưu kết quả kiểm tra độ ẩm!' });
      setIsMessageOpen(true);

      // Reset form
      setPoHeader(null);
      setPoItems([]);
      setSelectedItem(null);
      setPoSearchTerm('');
      setSamples(initializeDefaultSamples(3));
      setSampleQty(3);
      setInspectedQty('');
      setFailedQty(0);
      setItemNotes('');

      fetchHistory();
    } catch (err) {
      console.error("Lỗi khi lưu phiếu:", err);
      const serverMsg = err.response?.data?.detail;
      const errMsg = serverMsg ? (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)) : (err.message || 'Có lỗi xảy ra khi lưu phiếu kiểm tra!');
      setMessageConfig({ type: 'error', title: 'Lỗi', message: errMsg });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInspection = () => {
    setPoHeader(null);
    setPoItems([]);
    setSelectedItem(null);
    setPoSearchTerm('');
    setSamples(initializeDefaultSamples(3));
    setSampleQty(3);
    setInspectedQty('');
    setFailedQty(0);
    setItemNotes('');
  };

  return (
    <Layout>
      <div style={{ backgroundColor: '#FAF6F0', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="Phiếu kiểm tra theo công đoạn" />

        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* PO Search box */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Mã PO</label>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={isPoFocused ? poSearchTerm : (poHeader?.po_code || poSearchTerm)}
                  onChange={(e) => {
                    setPoSearchTerm(e.target.value);
                    setShowPoSuggestions(true);
                  }}
                  onFocus={() => {
                    setIsPoFocused(true);
                    setShowPoSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsPoFocused(false);
                      setShowPoSuggestions(false);
                    }, 200);
                  }}
                  placeholder="Chọn hoặc nhập tìm kiếm mã PO..."
                  style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                {poSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setPoSearchTerm('');
                      setPoHeader(null);
                      setPoItems([]);
                      setSelectedItem(null);
                    }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => handleSearchPO()}
                disabled={isPoSearching}
                style={{ width: '42px', height: '38px', borderRadius: '8px', border: 'none', backgroundColor: '#5d3b32', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Search size={18} color="#fff" />
              </button>
            </div>

            {/* Suggestions list */}
            {showPoSuggestions && filteredPOs.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '64px',
                left: '16px',
                right: '16px',
                backgroundColor: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 200,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {filteredPOs.map((po, index) => (
                  <div
                    key={index}
                    onMouseDown={() => {
                      setPoSearchTerm(po.order_code);
                      handleSearchPO(po.order_code);
                      setShowPoSuggestions(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: '#fff',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      color: '#1e293b'
                    }}
                  >
                    {po.order_code} - {po.customer || 'Không có tên nhà CC'}
                  </div>
                ))}
              </div>
            )}



            {poNotFound && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Không tìm thấy mã PO</div>}

            {/* Pills 5 lịch sử PO tìm kiếm gần nhất */}
            {recentPOs.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                {recentPOs.map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      setPoSearchTerm(code);
                      handleSearchPO(code);
                    }}
                    style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card: Thông tin kiểm tra */}
          {poHeader && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'visible' }}>

              {/* Header Thẻ */}
              <div style={{ padding: '12px 16px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #e8e1d5', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4b301e' }}>Thông tin kiểm tra</span>
                <button
                  onClick={() => {
                    setMessageConfig({
                      type: 'info',
                      title: 'QTKT - Kiểm tra độ ẩm',
                      message: 'QC sử dụng máy đo độ ẩm gỗ chuyên dụng, lấy mẫu 3 tiêu điểm tại các vị trí khác nhau trên bề mặt. Yêu cầu độ ẩm tiêu chuẩn từ 8% đến 12%.'
                    });
                    setIsMessageOpen(true);
                  }}
                  style={{ padding: '4px 10px', backgroundColor: '#4b301e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Xem QTKT
                </button>
              </div>

              {/* Form Fields */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Cộng đoạn & Tên sản phẩm */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Cộng đoạn</label>
                    <input
                      type="text"
                      readOnly
                      value={user?.activeStageDescription || user?.activeStageName || 'TNaa'}
                      style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px', color: '#64748b', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Tên sản phẩm</label>
                    <select
                      value={selectedItem?.item_code || ''}
                      onChange={(e) => {
                        const found = poItems.find(i => i.item_code === e.target.value);
                        if (found) {
                          setSelectedItem(found);
                          const initialQty = found.quantity || 0;
                          setInspectedQty(initialQty);
                          setFailedQty(0);
                          setSamples(initializeDefaultSamples(3));
                          setSampleQty(3);
                        }
                      }}
                      style={{ width: '100%', height: '38px', padding: '0 8px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    >
                      {poItems.map(item => (
                        <option key={item.item_code} value={item.item_code}>{item.item_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SL kiểm tra & SL không đạt */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>SL kiểm tra</label>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <input
                        type="number"
                        value={inspectedQty}
                        onChange={(e) => setInspectedQty(e.target.value.replace(/[-+eE]/g, ''))}
                        style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{selectedItem?.unit || 'tấm'}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>SL không đạt</label>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <input
                        type="number"
                        value={failedQty}
                        onChange={(e) => setFailedQty(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{selectedItem?.unit || 'tấm'}</span>
                    </div>
                  </div>
                </div>

                {/* Parameter select and sample counter controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>

                  {/* Row 1: Label and Combobox select side-by-side */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ flex: '0 0 42%', fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e' }}>Chọn thông số cần KT</label>
                    <select
                      value={activeParameter}
                      onChange={(e) => setActiveParameter(e.target.value)}
                      style={{ flex: '1', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: '600', color: '#4b301e' }}
                    >
                      <option value="moisture">Kiểm tra độ ẩm</option>
                      <option value="size">Kiểm tra kích thước</option>
                      <option value="visual">Kiểm tra ngoại quan</option>
                      <option value="functional">Kiểm tra chức năng</option>
                    </select>
                  </div>

                  {/* Row 2: Mẫu kiểm tra label and counter controls side-by-side */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ flex: '0 0 42%', fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e' }}>Mẫu kiểm tra</label>
                    <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => handleUpdateSampleQty(sampleQty - 1)} 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >-</button>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{sampleQty}</span>
                      <button 
                        type="button"
                        onClick={() => handleUpdateSampleQty(sampleQty + 1)} 
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', backgroundColor: '#5d3b32', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >+</button>
                    </div>
                  </div>

                  {/* Warning Notice Block */}
                  <div style={{ color: '#4b5563', fontSize: '11.5px', fontWeight: '500', padding: '8px 12px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', lineHeight: '1.4' }}>
                    Lưu ý: Nếu số lượng cần kiểm tra &gt;10 thì bạn chỉ cần tải 10 bằng chứng kiểm tra
                  </div>
                </div>

                {/* Table of samples */}
                <div style={{ border: '1px solid #e8e1d5', borderRadius: '8px', overflow: 'hidden', marginTop: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #e8e1d5' }}>
                        <th style={{ padding: '8px', width: '40px' }}>STT</th>
                        <th style={{ padding: '8px', width: '85px' }}>Kết quả</th>
                        <th style={{ padding: '8px' }}>Thông số</th>
                        <th style={{ padding: '8px', width: '60px' }}>Hình ảnh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.slice(0, 10).map((sample, idx) => {
                        const resVal = sample.result || 'untested';
                        const resLabel = resVal === 'pass' ? 'Đạt' : (resVal === 'fail' ? 'Lỗi' : 'Chưa KT');
                        const pillBg = resVal === 'pass' ? '#e8f5e9' : (resVal === 'fail' ? '#ffebee' : '#f1f5f9');
                        const pillColor = resVal === 'pass' ? '#2e7d32' : (resVal === 'fail' ? '#d32f2f' : '#64748b');
                        
                        let valText = '';
                        let photoUrl = '';
                        if (activeParameter === 'moisture') {
                          valText = sample.moisture?.values?.join(' | ') || '';
                          photoUrl = sample.moisture?.photo;
                        } else if (activeParameter === 'size') {
                          valText = [sample.size?.thickness, sample.size?.width, sample.size?.length].filter(Boolean).join(' x ') || '';
                          photoUrl = sample.size?.photo;
                        } else {
                          valText = sample[activeParameter]?.values?.join(' | ') || '';
                          photoUrl = sample[activeParameter]?.photo;
                        }

                        return (
                          <tr key={sample.stt} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                            <td style={{ padding: '10px 4px', fontWeight: 'bold', color: '#4b301e' }}>{sample.stt}</td>
                            <td style={{ padding: '10px 4px' }}>
                              <button
                                onClick={() => handleToggleRowResult(idx)}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: pillBg, color: pillColor, width: '100%' }}
                              >
                                {resLabel}
                              </button>
                            </td>
                            <td style={{ padding: '10px 4px', color: '#4b301e', fontSize: '11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span>{valText}</span>
                                <button
                                  onClick={() => handleOpenPhotoModal(idx, activeParameter)}
                                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Pencil size={14} color="#7c6d5e" />
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '10px 4px' }}>
                              {photoUrl ? (
                                <img src={photoUrl} alt="sample" style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover', margin: '0 auto', display: 'block' }} />
                              ) : (
                                <div style={{ width: '30px', height: '30px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                  <ImageIcon size={14} color="#cbd5e1" />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Item general note */}
                <div style={{ marginTop: '4px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', marginBottom: '4px' }}>Ghi chú chung</label>
                  <textarea
                    rows="2"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="Nhập ghi chú chung..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Save and cancel action buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    onClick={handleSubmitInspection}
                    disabled={isSaving}
                    style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(75, 48, 30, 0.2)' }}
                  >
                    <Check size={18} /> {isSaving ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                  <button
                    onClick={handleCancelInspection}
                    style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <RotateCcw size={18} /> Hủy
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Daily history */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e', margin: '0 0 12px 0' }}>Lịch sử kiểm tra trong ngày</h3>
            {isHistoryLoading ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Đang tải...</div>
            ) : filteredHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedHistoryItem(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#fdfbf7', borderRadius: '10px', border: '1px solid #f0ede8', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>{item.product_sku}</span>
                      <span style={{ fontSize: '11px', color: '#7c6d5e' }}>QC: {item.inspector_name} - KQ: <span style={{ fontWeight: '700', color: item.conclusion === 'pass' ? '#10b981' : '#ef4444' }}>{item.conclusion === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</span></span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#a3978b' }}>{formatDateTime(item.inspection_date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>Không có lịch sử kiểm tra.</div>
            )}
          </div>

        </div>

        {/* OCR modal file upload input */}
        <input type="file" ref={modalFileInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={onModalFileChange} />

        {/* Dynamic parameter modal popup */}
        {activeModalType && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setActiveModalType(null)} />
            <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '380px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#4b301e', margin: 0 }}>
                  {activeModalType === 'size' ? 'Thêm kích thước đo' : 'Thêm ảnh kiểm tra'}
                </h3>
                <button onClick={() => setActiveModalType(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><X size={18} color="#94a3b8" /></button>
              </div>

              <span style={{ fontSize: '12px', color: '#7c6d5e', textAlign: 'center', marginTop: '-4px' }}>Vui lòng xác nhận thông số sau khi chụp ảnh!</span>

              {/* Camera view */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '16px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {singlePhoto ? (
                    <img src={singlePhoto.startsWith('blob:') ? singlePhoto : `${apiClient.defaults.baseURL.split('/api/v1')[0]}${singlePhoto}`} alt="sample-pic" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={36} color="#94a3b8" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current.click()}
                  disabled={isUploadingImage || isOcrProcessing}
                  style={{ padding: '6px 14px', border: '1px solid #4b301e', backgroundColor: '#fff', color: '#4b301e', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isOcrProcessing ? 'Đang nhận diện...' : isUploadingImage ? 'Đang tải...' : singlePhoto ? 'Chụp lại' : 'Chụp ảnh'}
                </button>
                <span style={{ fontSize: '10px', color: '#b45309', textAlign: 'center', maxWidth: '280px', lineHeight: '1.4', fontWeight: '500', marginTop: '2px' }}>
                  Mẹo: Chụp cận cảnh, vuông góc với màn hình LCD để AI đọc số chính xác nhất!
                </span>
              </div>

              {/* Tabs for Dimensions only */}
              {activeModalType === 'size' && (
                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
                  {['thickness', 'width', 'length'].map((tab) => {
                    const tabLabel = tab === 'thickness' ? 'Dày' : (tab === 'width' ? 'Rộng' : 'Dài');
                    const isActive = sizeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSizeTab(tab)}
                        style={{ flex: 1, height: '34px', border: 'none', backgroundColor: isActive ? '#5d3b32' : 'transparent', color: isActive ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input Forms */}
              {activeModalType === 'size' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '4px 0' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#5d3b32' }}>
                      {sizeTab === 'thickness' ? 'Dày:' : (sizeTab === 'width' ? 'Rộng:' : 'Dài:')}
                    </span>
                    <input
                      type="text"
                      value={sizeTab === 'thickness' ? sizeThickness : (sizeTab === 'width' ? sizeWidth : sizeLength)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (sizeTab === 'thickness') setSizeThickness(val);
                        else if (sizeTab === 'width') setSizeWidth(val);
                        else if (sizeTab === 'length') setSizeLength(val);
                      }}
                      disabled={isOcrProcessing || !allowManualInput}
                      placeholder={isOcrProcessing ? "Đang đọc..." : "Nhập số..."}
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', textAlign: 'center', fontWeight: 'bold', color: '#5d3b32', backgroundColor: (isOcrProcessing || !allowManualInput) ? '#f1f5f9' : '#fff' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#5d3b32' }}>mm</span>
                  </div>

                  <div style={{ backgroundColor: '#fdfbf7', border: '1px solid #e8e1d5', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0ede8', paddingBottom: '4px' }}>
                      <span style={{ color: '#7c6d5e', fontWeight: 'bold' }}>Dày:</span>
                      <span style={{ fontWeight: '700', color: sizeThickness ? '#4b301e' : '#94a3b8' }}>{sizeThickness ? `${sizeThickness} mm` : 'Chưa đo'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0ede8', paddingBottom: '4px' }}>
                      <span style={{ color: '#7c6d5e', fontWeight: 'bold' }}>Rộng:</span>
                      <span style={{ fontWeight: '700', color: sizeWidth ? '#4b301e' : '#94a3b8' }}>{sizeWidth ? `${sizeWidth} mm` : 'Chưa đo'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#7c6d5e', fontWeight: 'bold' }}>Dài:</span>
                      <span style={{ fontWeight: '700', color: sizeLength ? '#4b301e' : '#94a3b8' }}>{sizeLength ? `${sizeLength} mm` : 'Chưa đo'}</span>
                    </div>
                  </div>
                </div>
              ) : activeModalType === 'moisture' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 0' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>Độ độ ẩm (MC):</span>
                    <input
                      type="text"
                      value={singleValue}
                      onChange={(e) => setSingleValue(e.target.value)}
                      disabled={isOcrProcessing || !allowManualInput}
                      placeholder={isOcrProcessing ? "Đang đọc..." : (allowManualInput ? "Nhập..." : "Chụp ảnh để đo")}
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', color: '#10b981', backgroundColor: (isOcrProcessing || !allowManualInput) ? '#f1f5f9' : '#fff' }}
                    />
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>%</span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#7c6d5e', fontWeight: 'bold', textAlign: 'center', borderTop: '1px solid #f0ede8', paddingTop: '8px' }}>
                    Thông số hiện tại: {modalValues.length > 0 ? modalValues.join(', ') : 'Chưa có'}
                  </div>
                </div>
              ) : (
                // visual or functional
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 0' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b301e' }}>Thông số đo được:</span>
                    <input
                      type="text"
                      value={singleValue}
                      onChange={(e) => setSingleValue(e.target.value)}
                      placeholder="Nhập trị số..."
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold', color: '#4b301e' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid #f0ede8', paddingTop: '8px' }}>
                    <span style={{ color: '#7c6d5e', fontWeight: 'bold' }}>Thông số hiện tại: {modalValues.length > 0 ? modalValues.join(', ') : 'Chưa có'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const valStr = String(singleValue || '').trim();
                        if (valStr) {
                          setModalValues(prev => [...prev, valStr]);
                          setSingleValue('');
                        }
                      }}
                      style={{ border: 'none', backgroundColor: '#5d3b32', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      + Đo thêm
                    </button>
                  </div>
                </div>
              )}

              {/* Modal actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleConfirmModalValues}
                  disabled={isUploadingImage || isOcrProcessing}
                  style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>

            </div>
          </div>
        )}

        {/* History detail popup */}
        {selectedHistoryItem && (
          <InspectionDetailPopup
            item={selectedHistoryItem}
            onClose={() => setSelectedHistoryItem(null)}
          />
        )}

        {/* Message modals */}
        <MessageModal
          isOpen={isMessageOpen}
          onConfirm={() => setIsMessageOpen(false)}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
        />
      </div>
    </Layout>
  );
};

export default StageMoistureView;
