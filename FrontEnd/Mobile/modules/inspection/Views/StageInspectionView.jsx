import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import FormInput from '@mobile/Shared/Views/components/form/FormInput';
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PassFailSelector from '@mobile/Shared/Views/components/ui/PassFailSelector';
import InspectionDetailPopup, { formatDateTime, getTypeName } from './components/InspectionDetailPopup';
import SearchableSelect from '@mobile/Shared/Views/components/form/SearchableSelect';
import { Camera, X, Image as ImageIcon, Check, RotateCcw, Search, Plus, Pencil, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

/**
 * Custom Switch/Toggle Component matching mockup style
 */
const MockupToggle = ({ value, onChange, disabled }) => {
  const isPass = value === 'pass';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        onClick={() => !disabled && onChange(isPass ? 'fail' : 'pass')}
        style={{
          width: '50px',
          height: '26px',
          borderRadius: '13px',
          backgroundColor: isPass ? '#5d3b32' : '#e2e8f0',
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          display: 'inline-block',
          border: '1px solid #cbd5e1'
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            position: 'absolute',
            top: '2px',
            left: isPass ? '26px' : '2px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      </div>
      <span style={{
        fontWeight: 'bold',
        fontSize: '13px',
        color: isPass ? '#10b981' : '#ef4444'
      }}>
        {isPass ? 'Đạt' : 'Không đạt'}
      </span>
    </div>
  );
};

const initializeDefaultSamples = (qty) => {
  return Array.from({ length: qty }, (_, i) => ({
    stt: i + 1,
    dimensions: { values: [], photo: null },
    moisture: { values: [], photo: null },
    function: 'pass',
    visual: 'pass'
  }));
};

const StageInspection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logId } = location.state || {};
  const { user } = useAuthStore();
  const inspectionType = 'dau-vao';

  const [isSaving, setIsSaving] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [monthlySearchTerm, setMonthlySearchTerm] = useState('');
  const [orders, setOrders] = useState([]);

  // --- Redesigned Input Inspection (dau-vao) states ---
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [recentPOs, setRecentPOs] = useState([]);
  const [isPoSearching, setIsPoSearching] = useState(false);
  const [poNotFound, setPoNotFound] = useState(false);
  const [poHeader, setPoHeader] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [poCardExpanded, setPoCardExpanded] = useState(true);

  // Map of inspected drafts in this session: item_code -> { sampleQty, samples, isWood, conclusion, notes, action }
  const [inspectedDrafts, setInspectedDrafts] = useState({});
  const [existingInspectionsMap, setExistingInspectionsMap] = useState({});

  // Active item inspection state
  const [selectedItem, setSelectedItem] = useState(null);
  const [sampleQty, setSampleQty] = useState(3);
  const [samples, setSamples] = useState([]);
  const [isWood, setIsWood] = useState(false);
  const [itemNotes, setItemNotes] = useState('');
  const [itemConclusion, setItemConclusion] = useState('pass');
  const [itemAction, setItemAction] = useState('luu-kho');
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [isDefectsExpanded, setIsDefectsExpanded] = useState(true);

  // Photo modal states
  const [activeSampleIndex, setActiveSampleIndex] = useState(null);
  const [activeModalType, setActiveModalType] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // New Smart Popup states for single-photo workflow
  const [activeSizeTab, setActiveSizeTab] = useState('day'); // 'day' | 'rong' | 'dai'
  const [activeMoistureIndex, setActiveMoistureIndex] = useState('new'); // index or 'new'
  const [tempValues, setTempValues] = useState([]);
  const [tempPhotos, setTempPhotos] = useState([]);
  const [singleValue, setSingleValue] = useState('');
  const [singlePhoto, setSinglePhoto] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [allowManualInput, setAllowManualInput] = useState(false);

  const modalFileInputRef = useRef(null);

  // Defect tracking states
  const [defectTypes, setDefectTypes] = useState([]);
  const [activeDefects, setActiveDefects] = useState([{ defectId: '', quantity: 1, isHeavy: true, images: [] }]);
  const [activeDefectIndex, setActiveDefectIndex] = useState(null);
  const [activeDefectPhotoIndex, setActiveDefectPhotoIndex] = useState(null);

  // Fetch Monthly History
  const fetchHistory = async (searchQuery = '') => {
    try {
      setIsHistoryLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      let url = `inspections/stage?month=${month}&year=${year}&limit=200`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await apiClient.get(url);
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
        const res = await apiClient.get('purchase-requisitions/?limit=200');
        if (res.data && Array.isArray(res.data.items)) {
          setOrders(res.data.items);
        }
      } catch (err) {
        console.error("Lỗi khi tải PO:", err);
      }
    };
    fetchPOs();

    const fetchDefectTypes = async () => {
      try {
        const url = user?.id ? `/inspections/defect-types?user_id=${user.id}` : '/inspections/defect-types';
        const res = await apiClient.get(url);
        if (Array.isArray(res.data)) {
          setDefectTypes(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh mục lỗi, sử dụng dữ liệu mặc định:", err);
        setDefectTypes([
          { id: 101, name: 'Bề mặt xước', category: 'visual', needs_tracking: true, is_active: true },
          { id: 102, name: 'Lệch màu', category: 'visual', needs_tracking: true, is_active: true },
          { id: 103, name: 'Bọt khí', category: 'visual', needs_tracking: false, is_active: true },
          { id: 104, name: 'Rỗ bề mặt', category: 'visual', needs_tracking: false, is_active: true },
          { id: 201, name: 'Sai kích thước bao', category: 'structure', needs_tracking: true, is_active: true },
          { id: 202, name: 'Móp méo góc', category: 'structure', needs_tracking: false, is_active: true },
          { id: 203, name: 'Độ dày không đều', category: 'structure', needs_tracking: false, is_active: true },
          { id: 301, name: 'Lẫn tạp chất', category: 'material', needs_tracking: true, is_active: true },
          { id: 302, name: 'Ẩm mốc', category: 'material', needs_tracking: false, is_active: true },
          { id: 303, name: 'Nứt vân', category: 'material', needs_tracking: false, is_active: true },
        ]);
      }
    };
    fetchDefectTypes();
  }, [user]);

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => item.inspection_type === 'dau-vao').slice(0, 3);
  }, [historyList]);

  // Load PO directly on search
  const handleSearchPO = async (codeOverride) => {
    const searchCode = (codeOverride || poSearchTerm).trim();
    if (!searchCode) return;
    setIsPoSearching(true);
    setPoNotFound(false);
    try {
      // 1. Fetch Order Header details to see if PO exists
      let order = null;
      try {
        const resHeader = await apiClient.get(`orders/code/${searchCode}`);
        order = resHeader.data;
      } catch (hErr) {}

      // A. Load from PO Items (Excel PurchaseOrderItems)
      let itemsList = [];
      let supplierName = 'N/A';
      let supplierCode = '';
      let orderDate = '';
      let deliveryDate = '';

      try {
        const itemsRes = await apiClient.get(`purchase-order-items/by-po/${searchCode}`);
        if (itemsRes.data && itemsRes.data.length > 0) {
          itemsList = itemsRes.data;
          supplierCode = itemsList[0].supplier_code || '';
          supplierName = itemsList[0].supplier_name || '';
          orderDate = itemsList[0].po_date || '';
          deliveryDate = itemsList[0].requested_delivery_date || '';
        }
      } catch (err) {}

      if (!order && itemsList.length === 0) {
        setPoNotFound(true);
        setPoItems([]);
        setPoHeader(null);
        setIsPoSearching(false);
        return;
      }

      // Aggregate all elements/items
      const aggregated = {};
      const addPart = (code, name, qty, opts = {}) => {
        const key = (name || code || '').trim();
        if (!key) return;

        // Loại bỏ mã sản phẩm cha (như 2-30-BRO, 2-42-BRO)
        const isProductSku = /^[A-Z0-9\-_]+$/.test(key) && key.includes('-');
        if (isProductSku) return;

        // Bỏ các loại ván ghép, ván ép, ván MDF, ván HMR (nguyên vật liệu thô)
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
            item_code: key,
            item_name: key,
            quantity: qty || 0
          };
        } else {
          aggregated[key].quantity = Math.max(aggregated[key].quantity, qty || 0);
        }
      };

      // Add Excel items
      itemsList.forEach(it => {
        addPart(it.item_code, it.item_name, it.quantity || 0, {
          is_raw_material: it.is_raw_material,
          exclude_production: it.exclude_production
        });
      });

      // B. Load from Plan Handover details
      if (order && order.plan_id) {
        try {
          const resPlan = await apiClient.get(`plans/${order.plan_id}?limit=0`);
          const planDetail = resPlan.data || {};
          if (planDetail.bom_details && Array.isArray(planDetail.bom_details.handover)) {
            const filteredHandover = planDetail.bom_details.handover.filter(item => {
              const names = Array.isArray(item.order_names) ? item.order_names : [];
              return names.map(n => n.trim().toUpperCase()).includes(searchCode);
            });
            filteredHandover.forEach(it => {
              addPart(it.name, it.name, it.quantity || 0, {
                is_raw_material: it.is_raw_material,
                exclude_production: it.exclude_production
              });
            });
          }
        } catch (planErr) {
          console.error('Lỗi khi tải chi tiết kế hoạch sản xuất:', planErr);
        }
      }

      // C. Load from PO products BOM elements (including sub-elements)
      try {
        const resProducts = await apiClient.get(`orders/by-code/${searchCode}/products`);
        const productsData = resProducts.data || {};
        if (Array.isArray(productsData.items)) {
          productsData.items.forEach(it => {
            addPart(it.sku, it.name, 0);
          });
        }
        if (Array.isArray(productsData.products)) {
          productsData.products.forEach(p => {
            if (Array.isArray(p.elements)) {
              p.elements.forEach(el => {
                addPart(el.sku, el.name, el.quantity || 0, {
                  is_raw_material: el.is_raw_material,
                  exclude_production: el.exclude_production
                });
              });
            }
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
        setIsPoSearching(false);
        return;
      }

      let headerInfo = {
        po_code: searchCode,
        supplier_code: supplierCode,
        supplier_name: supplierName || (order ? order.customer : 'N/A'),
        order_date: orderDate || (order ? order.create_date : ''),
        delivery_date: deliveryDate || (order ? order.estimated_date : '')
      };

      try {
        const reqRes = await apiClient.get(`purchase-requisitions/?search=${searchCode}`);
        if (reqRes.data && reqRes.data.items && reqRes.data.items.length > 0) {
          const matchedReq = reqRes.data.items.find(r => r.po_code === searchCode) || reqRes.data.items[0];
          headerInfo.order_date = matchedReq.order_date;
          headerInfo.delivery_date = matchedReq.delivery_date;
          headerInfo.supplier_code = matchedReq.supplier_code;
          headerInfo.supplier_name = matchedReq.supplier_name;
        }
      } catch (err) { }

      // Fetch existing inspections for this PO
      const insRes = await apiClient.get(`inspections/stage?batch_no=${searchCode}`);
      const inspections = insRes.data;
      const map = {};
      if (Array.isArray(inspections)) {
        inspections.forEach(ins => {
          if (ins.product_sku) {
            const key = ins.product_sku.toLowerCase();
            // Giữ bản ghi mới nhất (API trả về DESC theo ngày)
            if (!map[key]) {
              map[key] = ins;
            }
          }
        });
      }

      setExistingInspectionsMap(map);
      setPoHeader(headerInfo);
      setPoItems(mergedItems);
      setInspectedDrafts({});

      // Add to recent search histories
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

  const handleSearchPOByCode = (code) => {
    setPoSearchTerm(code);
    handleSearchPO(code);
  };

  const isWoodProduct = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    const woodKeywords = ["gỗ", "thanh", "oak", "sồi", "board", "ván", "wood", "venear", "tràm", "pine", "thông"];
    return woodKeywords.some(keyword => lower.includes(keyword));
  };

  const ensureTrailingEmptySample = (samplesList) => {
    if (samplesList.length === 0) {
      return initializeDefaultSamples(3);
    }
    const last = samplesList[samplesList.length - 1];
    const isLastMeasured = (last.dimensions?.values?.length > 0) || (last.moisture?.values?.length > 0) || (last.visual === 'fail') || (last.function === 'fail');
    if (isLastMeasured) {
      return [
        ...samplesList,
        {
          stt: samplesList.length + 1,
          dimensions: { values: [], photo: null },
          moisture: { values: [], photo: null },
          function: 'pass',
          visual: 'pass'
        }
      ];
    }
    return samplesList;
  };

  const handleStartInspection = (item) => {
    setSelectedItem(item);
    const draft = item.item_code ? inspectedDrafts[item.item_code.toLowerCase()] : null;
    const existing = item.item_code ? existingInspectionsMap[item.item_code.toLowerCase()] : null;
    const maxQty = item.quantity || 9999;

    if (draft) {
      const normalizedSamples = ensureTrailingEmptySample(draft.samples);
      const initialQty = Math.min(normalizedSamples.length, maxQty);
      setSampleQty(initialQty);
      setSamples(normalizedSamples.slice(0, initialQty));
      setIsWood(draft.isWood);
      setItemNotes(draft.notes);
      setItemConclusion(draft.conclusion);
      setItemAction(draft.action || 'luu-kho');
      setActiveDefects(draft.defects && draft.defects.length > 0 ? draft.defects : [{ defectId: '', quantity: 1, isHeavy: true, images: [] }]);
    } else if (existing) {
      let extra = {};
      try {
        extra = typeof existing.data_json === 'string' ? JSON.parse(existing.data_json) : (existing.data_json || {});
      } catch (e) { }

      const savedSamples = extra.samples || [];
      const initialSamples = savedSamples.length > 0 ? savedSamples : initializeDefaultSamples(Math.min(3, maxQty));
      const normalizedSamples = ensureTrailingEmptySample(initialSamples);
      const initialQty = Math.min(normalizedSamples.length, maxQty);

      setSampleQty(initialQty);
      setSamples(normalizedSamples.slice(0, initialQty));
      setIsWood(extra.is_wood !== undefined ? extra.is_wood : isWoodProduct(item.item_name));
      setItemNotes(existing.notes || '');
      setItemConclusion(existing.conclusion || 'pass');
      setItemAction(extra.action || 'luu-kho');
      setActiveDefects(extra.defects && extra.defects.length > 0 ? extra.defects : [{ defectId: '', quantity: 1, isHeavy: true, images: [] }]);
    } else {
      const defaultQty = Math.min(3, maxQty);
      setSampleQty(defaultQty);
      setSamples(initializeDefaultSamples(defaultQty));
      setIsWood(isWoodProduct(item.item_name));
      setItemNotes('');
      setItemConclusion('pass');
      setItemAction('luu-kho');
      setActiveDefects([{ defectId: '', quantity: 1, isHeavy: true, images: [] }]);
    }
  };

  const autoSuggestConclusion = (currentSamples, currentDefects) => {
    let hasFail = false;
    for (const sample of currentSamples) {
      if (sample.visual === 'fail') hasFail = true;
      if (!isWood && sample.function === 'fail') hasFail = true;
    }
    const hasDefect = currentDefects.some(d => d.defectId && d.quantity > 0);
    if (hasDefect) {
      hasFail = true;
    }

    if (hasFail) {
      setItemConclusion('fail');
      if (itemAction === 'luu-kho') {
        setItemAction('tra-ve');
      }
    } else {
      setItemConclusion('pass');
      if (itemAction === 'tra-ve' || itemAction === 'cach-ly') {
        setItemAction('luu-kho');
      }
    }
  };

  const handleAddDefect = () => {
    const next = [...activeDefects, { defectId: '', quantity: 1, isHeavy: true, images: [], isExpanded: true }];
    setActiveDefects(next);
    autoSuggestConclusion(samples, next);
  };

  const handleRemoveDefect = (index) => {
    const next = activeDefects.filter((_, idx) => idx !== index);
    setActiveDefects(next);
    autoSuggestConclusion(samples, next);
  };

  const toggleDefectExpanded = (index) => {
    setActiveDefects(prev => prev.map((d, idx) => idx === index ? { ...d, isExpanded: d.isExpanded === false ? true : false } : d));
  };

  const handleUpdateDefect = (index, field, value) => {
    if (field === 'defectId') {
      const isDuplicate = activeDefects.some((d, idx) => idx !== index && String(d.defectId) === String(value));
      if (isDuplicate && value !== '') {
        alert("Loại lỗi này đã được chọn ở một mục khác. Vui lòng điều chỉnh số lượng ở mục đó thay vì tạo mục mới.");
        return;
      }
    }

    const next = [...activeDefects];
    if (field === 'defectId') {
      const selectedDefect = defectTypes.find(t => String(t.id) === String(value));
      const isHeavy = selectedDefect ? (selectedDefect.aql_class === 'Major' || selectedDefect.aql_class === 'Critical') : true;
      next[index] = { ...next[index], defectId: value, isHeavy };
    } else if (field === 'quantity') {
      const maxVal = sampleQty;
      const cappedVal = Math.max(0, Math.min(value, maxVal));
      next[index] = { ...next[index], quantity: cappedVal };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setActiveDefects(next);
    autoSuggestConclusion(samples, next);
  };

  const handleTriggerDefectCamera = (defectIdx, photoIdx) => {
    setActiveDefectIndex(defectIdx);
    setActiveDefectPhotoIndex(photoIdx);
    setActiveModalType('defect');
    if (modalFileInputRef.current) {
      modalFileInputRef.current.click();
    }
  };

  const handleRemoveDefectPhoto = (defectIdx, photoIdx) => {
    setActiveDefects(prev => {
      const next = [...prev];
      const currentImages = [...(next[defectIdx].images || [])];
      currentImages.splice(photoIdx, 1);
      next[defectIdx] = { ...next[defectIdx], images: currentImages.filter(Boolean) };
      return next;
    });
  };

  const handleUpdateSampleQty = (newQty) => {
    if (newQty < 1) return;
    const maxQty = selectedItem?.quantity || 9999;
    const cappedQty = Math.min(newQty, maxQty);
    setSampleQty(cappedQty);
    setSamples(prev => {
      if (cappedQty > prev.length) {
        const extra = Array.from({ length: cappedQty - prev.length }, (_, i) => ({
          stt: prev.length + i + 1,
          dimensions: { values: [], photos: [] },
          moisture: { values: [], photos: [] },
          function: 'pass',
          visual: 'pass'
        }));
        return [...prev, ...extra];
      } else {
        return prev.slice(0, cappedQty);
      }
    });
  };

  const handleOpenPhotoModal = (idx, type) => {
    setActiveSampleIndex(idx);
    setActiveModalType(type);
    setIsOcrProcessing(false);

    const sample = samples[idx];
    if (type === 'size') {
      const currentValues = sample.dimensions?.values || [];

      const initialValues = [currentValues[0] || '', currentValues[1] || '', currentValues[2] || ''];
      setTempValues(initialValues);

      let defaultTab = 'day';
      if (!initialValues[0]) {
        defaultTab = 'day';
      } else if (!initialValues[1]) {
        defaultTab = 'rong';
      } else if (!initialValues[2]) {
        defaultTab = 'dai';
      }
      setActiveSizeTab(defaultTab);

      const tabIdx = defaultTab === 'day' ? 0 : defaultTab === 'rong' ? 1 : 2;
      setSingleValue(String(initialValues[tabIdx] || ''));
      setSinglePhoto('');
      setAllowManualInput(!!initialValues[tabIdx]);
    } else if (type === 'moisture') {
      const currentValues = sample.moisture?.values || [];

      setTempValues([...currentValues]);
      setActiveMoistureIndex('new');
      setSingleValue('');
      setSinglePhoto('');
      setAllowManualInput(false);
    }
  };

  const handleSwitchSizeTab = (tab) => {
    const oldIdx = activeSizeTab === 'day' ? 0 : activeSizeTab === 'rong' ? 1 : 2;
    const updatedValues = [...tempValues];
    updatedValues[oldIdx] = singleValue;
    setTempValues(updatedValues);

    setActiveSizeTab(tab);
    const newIdx = tab === 'day' ? 0 : tab === 'rong' ? 1 : 2;
    setSingleValue(String(updatedValues[newIdx] || ''));
    setSinglePhoto('');
    setAllowManualInput(!!updatedValues[newIdx]);
    setIsOcrProcessing(false);
  };

  const handleSwitchMoistureIndex = (tabIdx) => {
    const updatedValues = [...tempValues];
    if (activeMoistureIndex === 'new') {
      if (singleValue.trim() !== '') {
        updatedValues.push(parseFloat(singleValue));
      }
    } else {
      if (singleValue.trim() !== '') {
        updatedValues[activeMoistureIndex] = parseFloat(singleValue);
      } else {
        updatedValues.splice(activeMoistureIndex, 1);
      }
    }
    setTempValues(updatedValues);

    setActiveMoistureIndex(tabIdx);
    if (tabIdx === 'new') {
      setSingleValue('');
      setSinglePhoto('');
      setAllowManualInput(false);
    } else {
      setSingleValue(String(updatedValues[tabIdx] || ''));
      setSinglePhoto('');
      setAllowManualInput(true);
    }
    setIsOcrProcessing(false);
  };

  const onModalFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (activeModalType === 'defect') {
      setIsUploadingImage(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('files', files[0]);

        const res = await apiClient.post('inspections/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data && res.data.paths && res.data.paths.length > 0) {
          const newPath = res.data.paths[0];
          setActiveDefects(prev => {
            const next = [...prev];
            const currentImages = [...(next[activeDefectIndex].images || [])];
            currentImages[activeDefectPhotoIndex] = newPath;
            next[activeDefectIndex] = { ...next[activeDefectIndex], images: currentImages };
            return next;
          });
          setActiveModalType(null);
        }
      } catch (err) {
        console.error("Lỗi tải ảnh lỗi:", err);
      } finally {
        setIsUploadingImage(false);
        e.target.value = '';
      }
    } else {
      const localUrl = URL.createObjectURL(files[0]);
      setSinglePhoto(localUrl);

      setIsOcrProcessing(true);
      setAllowManualInput(false);

      try {
        const ocrFormData = new FormData();
        ocrFormData.append('file', files[0]);

        const res = await apiClient.post('inspections/upload-ocr', ocrFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data && res.data.value !== undefined) {
          const detectedVal = res.data.value;
          if (detectedVal !== null) {
            setSingleValue(String(detectedVal));
            setAllowManualInput(true);
          } else {
            alert("Không nhận diện được số đo từ ảnh. Vui lòng nhập thủ công!");
            setAllowManualInput(true);
          }
        } else {
          alert("Không nhận diện được số đo từ ảnh. Vui lòng nhập thủ công!");
          setAllowManualInput(true);
        }
      } catch (err) {
        console.error("Lỗi OCR:", err);
        alert("Lỗi kết nối AI Vision. Vui lòng tự nhập trị số!");
        setAllowManualInput(true);
      } finally {
        setIsOcrProcessing(false);
        e.target.value = '';
      }
    }
  };

  const handleConfirmModalValues = () => {
    let finalValues = [];

    if (activeModalType === 'size') {
      const tabIdx = activeSizeTab === 'day' ? 0 : activeSizeTab === 'rong' ? 1 : 2;
      const updatedValues = [...tempValues];
      updatedValues[tabIdx] = singleValue;

      const parsedValues = [];
      [0, 1, 2].forEach(i => {
        const valStr = String(updatedValues[i] || '').trim();
        if (valStr !== '') {
          parsedValues.push(parseFloat(valStr));
        }
      });

      if (parsedValues.length === 0) {
        alert("Vui lòng nhập ít nhất một trị số!");
        return;
      }

      // Kiểm tra giá trị hợp lệ
      const hasInvalid = parsedValues.some(val => isNaN(val) || val <= 0 || val > 10000);
      if (hasInvalid) {
        alert("Giá trị kích thước phải lớn hơn 0 và không vượt quá 10000 mm!");
        return;
      }

      finalValues = parsedValues;
    } else if (activeModalType === 'moisture') {
      const valStr = String(singleValue || '').trim();
      const updatedValues = [...tempValues];

      if (activeMoistureIndex === 'new') {
        if (valStr !== '') {
          updatedValues.push(parseFloat(valStr));
        }
      } else {
        if (valStr !== '') {
          updatedValues[activeMoistureIndex] = parseFloat(valStr);
        } else {
          updatedValues.splice(activeMoistureIndex, 1);
        }
      }

      if (updatedValues.length === 0) {
        alert("Vui lòng nhập ít nhất một trị số!");
        return;
      }

      // Kiểm tra giá trị hợp lệ
      const hasInvalid = updatedValues.some(val => isNaN(val) || val <= 0 || val > 100);
      if (hasInvalid) {
        alert("Giá trị độ ẩm phải lớn hơn 0% và không vượt quá 100%!");
        return;
      }

      finalValues = updatedValues;
    }

    const next = [...samples];
    const field = activeModalType === 'size' ? 'dimensions' : 'moisture';
    next[activeSampleIndex] = {
      ...next[activeSampleIndex],
      [field]: {
        values: finalValues,
        photos: []
      }
    };

    if (activeSampleIndex === next.length - 1) {
      next.push({
        stt: next.length + 1,
        dimensions: { values: [], photos: [] },
        moisture: { values: [], photos: [] },
        function: 'pass',
        visual: 'pass'
      });
      setSampleQty(next.length);
    }

    setSamples(next);
    setActiveModalType(null);
  };

  const handleToggleSampleValue = (idx, field, val) => {
    const next = [...samples];
    next[idx] = { ...next[idx], [field]: val };

    // Tự động sinh thêm mẫu tiếp theo nếu vừa toggle mẫu cuối cùng
    if (idx === next.length - 1) {
      next.push({
        stt: next.length + 1,
        dimensions: { values: [], photo: null },
        moisture: { values: [], photo: null },
        function: 'pass',
        visual: 'pass'
      });
      setSampleQty(next.length);
    }

    setSamples(next);
    autoSuggestConclusion(next, activeDefects);
  };

  const handleConfirmItemInspection = () => {
    if (itemAction === 'cach-ly' && (!itemNotes || !itemNotes.trim())) {
      alert("Vui lòng nhập ghi chú sản phẩm để nêu rõ nguyên nhân cách ly!");
      return;
    }

    // Lọc bỏ mẫu cuối cùng nếu nó hoàn toàn chưa được đo
    const cleanedSamples = samples.filter((s, idx) => {
      const isMeasured = (s.dimensions?.values?.length > 0) || (s.moisture?.values?.length > 0) || (s.visual === 'fail') || (s.function === 'fail');
      return idx < samples.length - 1 || isMeasured;
    });

    const defectsWithNames = activeDefects
      .filter(d => d.defectId)
      .map(d => {
        const found = defectTypes.find(t => t.id.toString() === d.defectId.toString());
        return {
          ...d,
          defect_name: found ? found.name : `Lỗi #${d.defectId}`
        };
      });

    setInspectedDrafts(prev => ({
      ...prev,
      [selectedItem.item_code.toLowerCase()]: {
        sampleQty: cleanedSamples.length,
        samples: cleanedSamples,
        isWood,
        conclusion: itemConclusion, // Save the actual selected/computed conclusion state directly
        notes: itemNotes,
        action: itemAction,
        defects: defectsWithNames
      }
    }));
    setSelectedItem(null);
  };

  const handleSaveAllNewInputInspections = async () => {
    const draftKeys = Object.keys(inspectedDrafts);
    if (draftKeys.length === 0) {
      setMessageConfig({ type: 'error', title: 'Lỗi', message: 'Bạn chưa thực hiện kiểm tra sản phẩm nào!' });
      setIsMessageOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      for (const itemCode of draftKeys) {
        const draft = inspectedDrafts[itemCode];
        const existing = existingInspectionsMap[itemCode];
        const item = poItems.find(i => i.item_code && i.item_code.toLowerCase() === itemCode.toLowerCase());

        const allImages = [];
        draft.samples.forEach(s => {
          if (s.dimensions?.photo) allImages.push(s.dimensions.photo);
          if (s.moisture?.photo) allImages.push(s.moisture.photo);
        });

        if (draft.defects) {
          draft.defects.forEach(def => {
            if (def.images) {
              def.images.forEach(img => {
                if (img) allImages.push(img);
              });
            }
          });
        }

        const payload = {
          inspection_type: 'dau-vao',
          batch_no: poHeader.po_code,
          product_sku: item?.item_code || itemCode,
          inspector_name: user?.full_name || "Người kiểm tra",
          conclusion: draft.conclusion,
          notes: draft.notes,
          data_json: JSON.stringify({
            po_code: poHeader.po_code,
            product_sku: itemCode,
            product_name: item?.item_name || '',
            total_qty: item?.quantity || 0,
            sample_qty: draft.sampleQty,
            is_wood: draft.isWood,
            action: draft.action,
            samples: draft.samples,
            defects: draft.defects
          }),
          images_json: JSON.stringify({ "Ảnh kiểm tra": allImages })
        };

        if (existing) {
          await apiClient.post(`inspections/stage/${existing.id}`, payload);
        } else {
          await apiClient.post('inspections/stage', payload);
        }
      }

      setMessageConfig({ type: 'success', title: 'Thành công', message: 'Đã lưu tất cả kết quả kiểm tra đầu vào!' });
      setIsMessageOpen(true);
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      const serverMsg = err.response?.data?.detail;
      const errMsg = serverMsg ? (typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)) : (err.message || 'Có lỗi xảy ra khi lưu phiếu kiểm tra!');
      setMessageConfig({ type: 'error', title: 'Lỗi', message: errMsg });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const getInspectedStatus = (item) => {
    if (!item || !item.item_code) return null;
    const draft = inspectedDrafts[item.item_code.toLowerCase()];
    if (draft) return draft.conclusion.toUpperCase();
    const existing = existingInspectionsMap[item.item_code.toLowerCase()];
    if (existing) return existing.conclusion.toUpperCase();
    return null;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch (e) { return dateStr; }
  };

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', paddingBottom: '100px', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB6 | Kiểm tra nhập kho" />

        {selectedItem ? (
          // Screen 2/3: Sample check form
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Khối 1: Thông tin sản phẩm */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Mã SP</label>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', fontWeight: 'bold' }}>{selectedItem.item_code}</div>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Tên sản phẩm</label>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedItem.item_name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Số lượng cần kiểm tra</label>
                  <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>{selectedItem.quantity} {selectedItem.unit}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Số lượng mẫu KT</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <button onClick={() => handleUpdateSampleQty(sampleQty - 1)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>-</button>
                    <input
                      type="number"
                      value={sampleQty === 0 ? '' : sampleQty}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[-+eE]/g, '');
                        if (val === '') {
                          setSampleQty(0);
                          return;
                        }
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          handleUpdateSampleQty(num);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        const pasteData = e.clipboardData.getData('text');
                        if (pasteData.includes('-') || pasteData.includes('+') || pasteData.includes('e') || pasteData.includes('E')) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => {
                        if (sampleQty < 1) {
                          handleUpdateSampleQty(1);
                        }
                      }}
                      style={{
                        flex: 1,
                        width: '0px',
                        height: '36px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: '800',
                        fontSize: '15px',
                        backgroundColor: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button onClick={() => handleUpdateSampleQty(sampleQty + 1)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: '#5d3b32', color: '#fff', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b301e' }}>Loại kiểm tra:</span>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1' }}>
                  <button onClick={() => setIsWood(true)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isWood ? '#5d3b32' : 'transparent', color: isWood ? '#fff' : '#64748b' }}>Gỗ (Độ ẩm)</button>
                  <button onClick={() => setIsWood(false)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: !isWood ? '#5d3b32' : 'transparent', color: !isWood ? '#fff' : '#64748b' }}>Phụ kiện</button>
                </div>
              </div>
            </div>

            {/* Khối 2: Bảng mẫu kiểm tra */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e8e1d5', overflow: 'hidden' }}>
              <div
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#f8f5f0',
                  borderBottom: isTableExpanded ? '1px solid #e8e1d5' : 'none',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e' }}>Bảng mẫu kiểm tra ({samples.length} mẫu)</span>
                  {samples.length > 5 && isTableExpanded && (
                    <span style={{ fontSize: '10px', color: '#8d6e63', backgroundColor: '#efebe9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Cuộn để xem</span>
                  )}
                </div>
                {isTableExpanded ? <ChevronUp size={16} color="#7c6d5e" /> : <ChevronDown size={16} color="#7c6d5e" />}
              </div>

              {isTableExpanded && (
                <div style={{ maxHeight: '280px', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8f5f0', boxShadow: '0 1px 0 #e8e1d5' }}>
                      <tr style={{ color: '#7c6d5e', fontSize: '12px', fontWeight: 'bold' }}>
                        <th style={{ padding: '12px 6px' }}>STT</th>
                        <th style={{ padding: '12px 6px' }}>Kích thước</th>
                        <th style={{ padding: '12px 6px' }}>{isWood ? 'Độ ẩm' : 'Chức năng'}</th>
                        <th style={{ padding: '12px 6px' }}>Ngoại quan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samples.map((sample, idx) => (
                        <tr key={sample.stt} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 6px', fontSize: '13px', fontWeight: 'bold', color: '#4b301e' }}>{sample.stt}</td>
                          <td style={{ padding: '10px 6px', fontSize: '12px' }}>
                            {sample.dimensions && sample.dimensions.values && sample.dimensions.values.length > 0 ? (
                              <div onClick={() => handleOpenPhotoModal(idx, 'size')} style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#2d1d12' }}>
                                {sample.dimensions.values.join(' | ')}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenPhotoModal(idx, 'size')}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  border: '1.5px solid #2d1d12',
                                  backgroundColor: 'transparent',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <Plus size={18} color="#2d1d12" strokeWidth={3} />
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '10px 6px', fontSize: '12px' }}>
                            {isWood ? (
                              sample.moisture && sample.moisture.values && sample.moisture.values.length > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <div onClick={() => handleOpenPhotoModal(idx, 'moisture')} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', fontWeight: 'bold', color: '#2d1d12', cursor: 'pointer' }}>
                                    {sample.moisture.values.map((v, i) => <span key={i}>{v}</span>)}
                                  </div>
                                  <button
                                    onClick={() => handleOpenPhotoModal(idx, 'moisture')}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      border: '1.2px solid #2d1d12',
                                      backgroundColor: 'transparent',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Plus size={12} color="#2d1d12" strokeWidth={3} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenPhotoModal(idx, 'moisture')}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '1.5px solid #2d1d12',
                                    backgroundColor: 'transparent',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Plus size={18} color="#2d1d12" strokeWidth={3} />
                                </button>
                              )
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <MockupToggle value={sample.function} onChange={(val) => handleToggleSampleValue(idx, 'function', val)} />
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}><MockupToggle value={sample.visual} onChange={(val) => handleToggleSampleValue(idx, 'visual', val)} /></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Khối 4: Kết quả kiểm tra, Hành động & Ghi chú */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Kết quả kiểm tra:</label>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                  {['pass', 'fail'].map((res) => {
                    const label = res === 'pass' ? 'Đạt' : 'Không đạt';
                    const active = itemConclusion === res;
                    return (
                      <div
                        key={res}
                        onClick={() => {
                          if (res === 'pass') {
                            setActiveDefects([{ defectId: '', quantity: 1, isHeavy: true, images: [] }]);
                          }
                          setItemConclusion(res);
                          setItemAction(res === 'pass' ? 'luu-kho' : 'tra-ve');
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          textAlign: 'center',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: active ? '#5d3b32' : '#fff',
                          color: active ? '#fff' : '#4b301e',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          border: active ? '1px solid #5d3b32' : '1px solid #e2e8f0',
                          boxShadow: active ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Hành động:</label>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '3px' }}>
                  {['luu-kho', 'cach-ly', 'tra-ve'].map((act) => {
                    const label = act === 'luu-kho' ? 'Nhập kho' : act === 'cach-ly' ? 'Cách ly' : 'Trả hàng';
                    const active = itemAction === act;
                    return (
                      <div
                        key={act}
                        onClick={() => {
                          setItemAction(act);
                          if (act === 'tra-ve') {
                            setItemConclusion('fail');
                          } else if (act === 'luu-kho') {
                            setItemConclusion('pass');
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          textAlign: 'center',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: active ? '#5d3b32' : '#fff',
                          color: active ? '#fff' : '#4b301e',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          border: active ? '1px solid #5d3b32' : '1px solid #e2e8f0',
                          boxShadow: active ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '4px' }}>
                  Ghi chú sản phẩm {itemAction === 'cach-ly' && <span style={{ color: '#ef4444' }}>(Bắt buộc khi cách ly) *</span>}
                </label>
                <textarea
                  rows="2"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder={itemAction === 'cach-ly' ? "Nhập rõ nguyên nhân cách ly (Bắt buộc)..." : "Nhập ghi chú..."}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: itemAction === 'cach-ly' && !itemNotes.trim() ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    transition: 'all 0.2s'
                  }}
                />
              </div>
            </div>

            {/* Khối 3: Phân hệ Ghi nhận lỗi phát hiện */}
            {itemConclusion === 'fail' && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e8e1d5', overflow: 'hidden' }}>
                <div
                  onClick={() => setIsDefectsExpanded(!isDefectsExpanded)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: '#f8f5f0',
                    borderBottom: isDefectsExpanded ? '1px solid #e8e1d5' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e' }}>Lỗi phát hiện ({activeDefects.length} lỗi)</span>
                    {activeDefects.length >= 2 && isDefectsExpanded && (
                      <span style={{ fontSize: '10px', color: '#8d6e63', backgroundColor: '#efebe9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Đang mở</span>
                    )}
                  </div>
                  {isDefectsExpanded ? <ChevronUp size={16} color="#7c6d5e" /> : <ChevronDown size={16} color="#7c6d5e" />}
                </div>

                {isDefectsExpanded && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {activeDefects.map((defect, defectIdx) => {
                      const foundDefect = defectTypes.find(t => String(t.id) === String(defect.defectId));
                      const defectName = foundDefect ? `${foundDefect.name} (${foundDefect.code || 'N/A'})` : '';
                      const isExpanded = defect.isExpanded !== false;

                      return (
                        <div key={defectIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', backgroundColor: '#fff', marginBottom: '8px' }}>

                          {/* Header của từng lỗi */}
                          <div
                            onClick={() => toggleDefectExpanded(defectIdx)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#4b301e', whiteSpace: 'nowrap' }}>Lỗi #{defectIdx + 1}:</span>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: defect.defectId ? '#2d1d12' : '#94a3b8',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}>
                                {defectName || 'Chưa chọn loại lỗi'}
                                {defect.defectId && ` (SL: ${defect.quantity || 1})`}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                              {activeDefects.length > 1 && (
                                <button
                                  onClick={() => handleRemoveDefect(defectIdx)}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                              <div onClick={() => toggleDefectExpanded(defectIdx)} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px' }}>
                                {isExpanded ? <ChevronUp size={16} color="#7c6d5e" /> : <ChevronDown size={16} color="#7c6d5e" />}
                              </div>
                            </div>
                          </div>

                          {/* Body của lỗi (chỉ hiện khi isExpanded true) */}
                          {isExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '4px' }}>

                              {/* Dòng 1: Dropdown chọn lỗi */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Tên lỗi phát hiện</label>
                                  <SearchableSelect
                                    value={defect.defectId}
                                    onChange={(e) => handleUpdateDefect(defectIdx, 'defectId', e.target.value)}
                                    placeholder="-- Gõ để tìm kiếm lỗi --"
                                    options={defectTypes
                                      .filter(t => {
                                        const isAlreadySelected = activeDefects.some((d, idx) => idx !== defectIdx && String(d.defectId) === String(t.id));
                                        return !isAlreadySelected;
                                      })
                                      .map(t => ({
                                        label: `${t.name} (${t.code || 'N/A'})`,
                                        value: String(t.id)
                                      }))
                                    }
                                  />
                                </div>
                              </div>

                              {/* Dòng 2: Số lượng lỗi, Toggle lỗi nặng/lỗi nhẹ */}
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Số lượng</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                                    <button
                                      onClick={() => handleUpdateDefect(defectIdx, 'quantity', Math.max(1, (defect.quantity || 1) - 1))}
                                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={defect.quantity === 0 ? '' : (defect.quantity || 1)}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[-+eE]/g, '');
                                        if (val === '') {
                                          handleUpdateDefect(defectIdx, 'quantity', 0);
                                          return;
                                        }
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num)) {
                                          handleUpdateDefect(defectIdx, 'quantity', num);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                                          e.preventDefault();
                                        }
                                      }}
                                      onPaste={(e) => {
                                        const pasteData = e.clipboardData.getData('text');
                                        if (pasteData.includes('-') || pasteData.includes('+') || pasteData.includes('e') || pasteData.includes('E')) {
                                          e.preventDefault();
                                        }
                                      }}
                                      onBlur={() => {
                                        if ((defect.quantity || 0) < 1) {
                                          handleUpdateDefect(defectIdx, 'quantity', 1);
                                        }
                                      }}
                                      style={{
                                        flex: 1,
                                        width: '0px',
                                        height: '32px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        textAlign: 'center',
                                        fontWeight: '800',
                                        fontSize: '14px',
                                        backgroundColor: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <button
                                      onClick={() => handleUpdateDefect(defectIdx, 'quantity', (defect.quantity || 1) + 1)}
                                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: '#5d3b32', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Mức độ lỗi</label>
                                  {!defect.defectId ? (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px',
                                      borderRadius: '8px', fontSize: '12px', fontWeight: '800',
                                      backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', textAlign: 'center'
                                    }}>
                                      Chọn lỗi...
                                    </div>
                                  ) : (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px',
                                      borderRadius: '8px', fontSize: '12px', fontWeight: '800',
                                      backgroundColor: defect.isHeavy ? '#fee2e2' : '#f0fdf4',
                                      color: defect.isHeavy ? '#ef4444' : '#166534',
                                      border: `1px solid ${defect.isHeavy ? '#fecaca' : '#bbf7d0'}`,
                                      textAlign: 'center'
                                    }}>
                                      {defect.isHeavy ? 'Lỗi nặng' : 'Lỗi nhẹ'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Dòng 3: Camera đính kèm ảnh (tối đa 3 ảnh lỗi) */}
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '6px' }}>Ảnh lỗi (tối đa 3 ảnh)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {[0, 1, 2].map((imgIdx) => {
                                    const imgPath = defect.images ? defect.images[imgIdx] : null;
                                    const fullUrl = imgPath ? `${apiClient.defaults.baseURL.split('/api/v1')[0]}${imgPath}` : null;
                                    return (
                                      <div
                                        key={imgIdx}
                                        style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                                        onClick={() => !imgPath && handleTriggerDefectCamera(defectIdx, imgIdx)}
                                      >
                                        {fullUrl ? (
                                          <>
                                            <img src={fullUrl} alt="defect" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveDefectPhoto(defectIdx, imgIdx);
                                              }}
                                              style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                                            >
                                              <X size={10} />
                                            </button>
                                          </>
                                        ) : (
                                          <Camera size={18} color="#94a3b8" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}

                    <button
                      onClick={handleAddDefect}
                      style={{ width: '100%', border: '1px dashed #5d3b32', borderRadius: '8px', padding: '10px', backgroundColor: '#faf6f0', color: '#5d3b32', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', marginTop: '4px' }}
                    >
                      <Plus size={16} /> + Thêm lỗi khác
                    </button>
                  </div>
                )}
              </div>
            )}

            <input type="file" ref={modalFileInputRef} style={{ display: 'none' }} accept="image/*" capture="environment" onChange={onModalFileChange} />

            {/* Khối 5: Nút Xác nhận và Hủy (nằm trong flow cuộn) */}
            <div style={{ padding: '8px 0 24px', display: 'flex', gap: '12px', zIndex: 100 }}>
              <button onClick={handleConfirmItemInspection} style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(75, 48, 30, 0.2)' }}><Check size={18} /> Xác nhận</button>
              <button onClick={() => setSelectedItem(null)} style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}><RotateCcw size={18} /> Hủy</button>
            </div>

            {activeModalType && activeModalType !== 'defect' && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setActiveModalType(null)} />
                <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '380px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#4b301e' }}>
                      {activeModalType === 'size' ? 'Thêm kích thước đo' : 'Thêm độ ẩm đo'}
                    </h3>
                    <button onClick={() => setActiveModalType(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><X size={18} color="#94a3b8" /></button>
                  </div>

                  <span style={{ fontSize: '12px', color: '#7c6d5e', textAlign: 'center', marginTop: '-4px' }}>Vui lòng xác nhận thông số sau khi chụp ảnh!</span>

                  {/* Khu vực Camera chụp ảnh ở giữa: 1 ô duy nhất */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '16px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                      {singlePhoto ? (
                        <img src={singlePhoto.startsWith('blob:') ? singlePhoto : `${apiClient.defaults.baseURL.split('/api/v1')[0]}${singlePhoto}`} alt="sample-pic" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Camera size={36} color="#94a3b8" />
                      )}
                    </div>
                    <button
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

                  {/* Khu vực Nhập giá trị và chuyển tab */}
                  {activeModalType === 'size' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Tabs chọn nhanh Dày, Rộng, Dài */}
                      <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                        {['day', 'rong', 'dai'].map((tab) => {
                          const label = tab === 'day' ? 'Dày' : tab === 'rong' ? 'Rộng' : 'Dài';
                          const active = activeSizeTab === tab;
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => handleSwitchSizeTab(tab)}
                              style={{ flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: active ? '#5d3b32' : 'transparent', color: active ? '#fff' : '#64748b', transition: 'all 0.2s' }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Input trị số đang đo */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 0' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444', textTransform: 'capitalize' }}>
                          {activeSizeTab === 'day' ? 'dày' : activeSizeTab === 'rong' ? 'rộng' : 'dài'}:
                        </span>
                        <input
                          type="number"
                          value={singleValue}
                          onChange={(e) => setSingleValue(e.target.value.replace(/[-+eE]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const pasteData = e.clipboardData.getData('text');
                            if (pasteData.includes('-') || pasteData.includes('+') || pasteData.includes('e') || pasteData.includes('E')) {
                              e.preventDefault();
                            }
                          }}
                          disabled={isOcrProcessing || !allowManualInput}
                          placeholder={isOcrProcessing ? "Đang đọc..." : (allowManualInput ? "Nhập..." : "Chụp ảnh để đo")}
                          style={{ width: '100px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444', backgroundColor: (isOcrProcessing || !allowManualInput) ? '#f1f5f9' : '#fff' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#7c6d5e' }}>mm</span>
                      </div>

                      {/* Danh sách các chiều đã đo (Thông số hiện tại) */}
                      <div style={{ backgroundColor: '#fdfbf7', border: '1px solid #e8e1d5', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', color: '#7c6d5e', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#4b301e', marginBottom: '2px' }}>Thông số đã đo:</span>
                        {['day', 'rong', 'dai'].map((tab) => {
                          const label = tab === 'day' ? 'Dày' : tab === 'rong' ? 'Rộng' : 'Dài';
                          const idx = tab === 'day' ? 0 : tab === 'rong' ? 1 : 2;
                          const valStr = tab === activeSizeTab ? singleValue : tempValues[idx];
                          const isActive = tab === activeSizeTab;
                          return (
                            <div key={tab} style={{ display: 'flex', justifyContent: 'space-between', padding: isActive ? '2px 4px' : '0', backgroundColor: isActive ? '#f1f5f9' : 'transparent', borderRadius: '4px' }}>
                              <span style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#4b301e' : '#7c6d5e' }}>{label}:</span>
                              <span style={{ fontWeight: 'bold', color: isActive ? '#ef4444' : '#2d1d12' }}>{valStr ? `${valStr} mm` : 'Chưa đo'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Input trị số đang đo Độ ẩm */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '6px 0' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>Độ độ ẩm (MC):</span>
                        <input
                          type="number"
                          value={singleValue}
                          onChange={(e) => setSingleValue(e.target.value.replace(/[-+eE]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const pasteData = e.clipboardData.getData('text');
                            if (pasteData.includes('-') || pasteData.includes('+') || pasteData.includes('e') || pasteData.includes('E')) {
                              e.preventDefault();
                            }
                          }}
                          disabled={isOcrProcessing || !allowManualInput}
                          placeholder={isOcrProcessing ? "Đang đọc..." : (allowManualInput ? "Nhập..." : "Chụp ảnh để đo")}
                          style={{ width: '90px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', color: '#10b981', backgroundColor: (isOcrProcessing || !allowManualInput) ? '#f1f5f9' : '#fff' }}
                        />
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>%</span>
                      </div>

                      {/* Thông số hiện tại ở dưới */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e' }}>Thông số hiện tại (MC %):</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {tempValues.map((val, idx) => {
                            const active = activeMoistureIndex === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSwitchMoistureIndex(idx)}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer', backgroundColor: active ? '#10b981' : '#fff', color: active ? '#fff' : '#64748b', fontWeight: 'bold' }}
                              >
                                {val}%
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleSwitchMoistureIndex('new')}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px dashed #5d3b32', fontSize: '11px', cursor: 'pointer', backgroundColor: activeMoistureIndex === 'new' ? '#5d3b32' : '#faf6f0', color: activeMoistureIndex === 'new' ? '#fff' : '#5d3b32', fontWeight: 'bold' }}
                          >
                            + Đo thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={handleConfirmModalValues} style={{ width: '100%', padding: '12px', border: 'none', backgroundColor: '#4b301e', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>Xác nhận</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Screen 1: PO search & Items list
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5' }}>
              <SearchableSelect
                label="PO"
                value={poSearchTerm}
                placeholder="Gõ để tìm kiếm..."
                options={orders.map(o => ({ label: o.po_code, value: o.po_code }))}
                onChange={(e) => {
                  const code = e.target.value;
                  setPoSearchTerm(code);
                  if (code) {
                    handleSearchPO(code);
                  }
                }}
              />
              {poNotFound && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Không tìm thấy mã PO</div>}
              
              {/* Pills 5 lịch sử PO tìm kiếm gần nhất */}
              {recentPOs.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                  {recentPOs.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleSearchPOByCode(code)}
                      style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>



            {poHeader && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e8e1d5', overflow: 'hidden' }}>
                <div onClick={() => setPoCardExpanded(!poCardExpanded)} style={{ padding: '12px 16px', backgroundColor: '#fcfcfc', borderBottom: '1px solid #e8e1d5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e' }}>Thông tin đơn hàng</span>
                  {poCardExpanded ? <ChevronUp size={18} color="#4b301e" /> : <ChevronDown size={18} color="#4b301e" />}
                </div>
                {poCardExpanded && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Mã NCC</label>
                        <div style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px' }}>{poHeader.supplier_code}</div>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Nhà cung cấp</label>
                        <div style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poHeader.supplier_name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Ngày đặt hàng</label>
                        <div style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px' }}>{formatDisplayDate(poHeader.order_date)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c6d5e', display: 'block', marginBottom: '4px' }}>Ngày nhận hàng</label>
                        <div style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px' }}>{formatDisplayDate(poHeader.delivery_date)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {poItems.length > 0 && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e8e1d5', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f5f0', borderBottom: '2px solid #e8e1d5', color: '#7c6d5e', fontSize: '12px', fontWeight: 'bold' }}>
                      <th style={{ padding: '12px 16px' }}>Tên</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Số lượng</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item) => {
                      const status = getInspectedStatus(item);
                      const existing = item.item_code ? existingInspectionsMap[item.item_code.toLowerCase()] : null;
                      let extra = {};
                      if (existing) {
                        try {
                          extra = typeof existing.data_json === 'string' ? JSON.parse(existing.data_json) : (existing.data_json || {});
                        } catch (e) { }
                      }
                      // Chỉ cho sửa nếu là phiếu kiểm tra mới (chưa có trong DB) hoặc nháp chưa duyệt hoặc có action là cách ly
                      const isEditable = !existing || (extra.action === 'cach-ly');

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 'bold', color: '#4b301e' }}>{item.item_name}</td>
                          <td style={{ padding: '12px 8px', fontSize: '12px', color: '#7c6d5e', textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {status ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                {existing ? (
                                  <button onClick={() => setSelectedHistoryItem(existing)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '6px' }}>
                                    <span style={{ fontWeight: '950', fontSize: '13px', color: status === 'PASS' ? '#10b981' : '#ef4444' }}>{status === 'PASS' ? 'Đạt' : 'Không đạt'}</span>
                                    <Eye size={13} color="#94a3b8" />
                                  </button>
                                ) : (
                                  <span style={{ fontWeight: '950', fontSize: '13px', color: status === 'PASS' ? '#10b981' : '#ef4444' }}>{status === 'PASS' ? 'Đạt' : 'Không đạt'}</span>
                                )}
                                {isEditable && (
                                  <button onClick={() => handleStartInspection(item)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><Pencil size={12} color="#7c6d5e" /></button>
                                )}
                              </div>
                            ) : (
                              isEditable && (
                                <button onClick={() => handleStartInspection(item)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px' }}><Pencil size={16} color="#7c6d5e" /></button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="responsive-fixed-footer" style={{ backgroundColor: '#FAF6F0', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e8e1d5', zIndex: 100 }}>
              <button onClick={handleSaveAllNewInputInspections} disabled={isSaving || Object.keys(inspectedDrafts).length === 0} style={{ flex: 1, backgroundColor: (isSaving || Object.keys(inspectedDrafts).length === 0) ? '#94a3b8' : '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: (isSaving || Object.keys(inspectedDrafts).length === 0) ? 'not-allowed' : 'pointer' }}><Check size={18} /> Xác nhận</button>
              <button onClick={() => { setPoHeader(null); setPoItems([]); setPoSearchTerm(''); }} style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}><RotateCcw size={18} /> Hủy</button>
            </div>
          </div>
        )}

        <MessageModal
          isOpen={isMessageOpen}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
          onConfirm={() => {
            setIsMessageOpen(false);
            if (messageConfig.type === 'success') {
              setPoHeader(null);
              setPoItems([]);
              setPoSearchTerm('');
            }
          }}
        />

        <InspectionDetailPopup
          item={selectedHistoryItem}
          onClose={() => setSelectedHistoryItem(null)}
        />
      </div>
    </Layout>
  );
};

export default StageInspection;
