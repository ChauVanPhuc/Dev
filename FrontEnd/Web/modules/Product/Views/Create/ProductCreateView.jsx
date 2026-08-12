import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Upload,
  Download,
  Send,
  Save,
  Search,
  ArrowUpDown,
  Filter,
  Sliders,
  Plus,
  Box,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import AddComponentModal from '../Detail/modals/AddComponentModal';
import AddDetailModal from '../Detail/modals/AddDetailModal';
import AddPaintColorModal from '../Detail/modals/AddPaintColorModal';
import ConfigInfoModal from '../Detail/modals/ConfigInfoModal';
import '@styles/components.css';

/**
 * View: Thêm mới sản phẩm mẫu (/admin/products/create)
 * Tái hiện 100% Giao diện & Tính năng tương đồng với trang Chi tiết sản phẩm (/admin/products/:id):
 * - Khung Thông tin chung: Top Action Bar (Lấy từ SP khác, Dán Excel, Xuất file, Chuyển TT, Lưu dữ liệu).
 * - Khung ảnh chính + 3 ảnh thumbnail phụ xếp dọc bên phải (Hỗ trợ tải ảnh xem trước).
 * - Form thông tin chung + Hàng Meta 6 ô xám bên dưới.
 * - Thanh Action Toolbar: Search, Sort A-Z, Filter, Dropdown Cấu hình thông tin, Dán từ Excel, + Thêm mới.
 * - Bảng BOM 13 cột chuẩn Mockup với STT phân cấp (1, 1.1, 1.1.1, 1.2, 2, 3...) & thụt lề cấp bậc.
 * - Hệ thống Tab: BOM sản phẩm, Quy trình thực hiện, Bản vẽ kỹ thuật, Định mức vật tư.
 */
const ProductCreateView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bom');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState('Định hình');

  // Modals & Dropdowns State
  const [showAddDetailModal, setShowAddDetailModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [showAddPaintModal, setShowAddPaintModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Image Upload Preview State
  const [mainImage, setMainImage] = useState(null);
  const [subImages, setSubImages] = useState([null, null, null]);
  const fileInputRef = useRef(null);

  // Form Thông tin chung
  const [formData, setFormData] = useState({
    sku: `SKU-${Date.now().toString().slice(-4)}`,
    category: 'Tủ quần áo',
    line: 'APT',
    name: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    note: '',
    updatedAt: new Date().toLocaleDateString('vi-VN'),
    updatedBy: 'Admin Hệ Thống',
    bomStatus: 'Mới tạo',
    totalComponents: '1',
    estimatedCost: '0',
    color: 'Màu tự nhiên'
  });

  // State chứa danh sách Danh mục động từ Backend API (/categories)
  const [categoriesOptions, setCategoriesOptions] = useState([]);

  // Bảng BOM phân cấp chuẩn 13 cột
  const [bomRows, setBomRows] = useState([
    {
      id: Date.now(),
      stt: '1',
      type: 'Sản phẩm',
      stageFrom: 'Đóng gói',
      stageTo: 'Lưu kho',
      compCode: '',
      compName: '',
      quantity: '1',
      unit: 'Cái',
      material: 'Gỗ / MDF',
      spec: '',
      volume: '1',
      length: 0,
      width: 0,
      height: 0,
      waste_ratio: 0,
      note: ''
    }
  ]);

  // Tab bổ sung: Chi tiết sản phẩm & Mẫu màu sơn
  const [detailRows, setDetailRows] = useState([]);
  const [paintColorRows, setPaintColorRows] = useState([]);

  // Gợi ý tên thành phẩm từ master_product_details
  const [detailSuggestions, setDetailSuggestions] = useState([]);
  const [detailMetaMap, setDetailMetaMap] = useState({});
  const [loaiOptions, setLoaiOptions] = useState([]);
  const [suggestionsByParent, setSuggestionsByParent] = useState({});
  const [activeCompNameRow, setActiveCompNameRow] = useState(null);
  const [activeTypeRow, setActiveTypeRow] = useState(null);
  const [loaiDropdownStyle, setLoaiDropdownStyle] = useState({ top: 0, left: 0, minWidth: 240 });
  const [compNameDropdownStyle, setCompNameDropdownStyle] = useState({ top: 0, left: 0, minWidth: 240 });
  const selectingCompNameRef = useRef(false);
  const selectingTypeRef = useRef(false);
  const loadedParentsRef = useRef(new Set());

  const loadSuggestionsForParent = async (parentName) => {
    if (!parentName || loadedParentsRef.current.has(parentName)) return;
    try {
      const res = await api.get(`/master-products/detail-suggestions?parent_name=${encodeURIComponent(parentName)}`).catch(() => null);
      if (res) {
        loadedParentsRef.current.add(parentName);
        setSuggestionsByParent(prev => ({ ...prev, [parentName]: res.detail_names || [] }));
      }
    } catch (err) {
      console.warn('Lỗi lấy chi tiết con theo loại:', err);
    }
  };

  // Load danh sách tên thành phẩm từ master
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/master-products/detail-suggestions').catch(() => null);
        if (res) {
          setDetailSuggestions(res.detail_names || []);
          setDetailMetaMap(res.detail_meta_map || {});
          const detailSet = new Set(res.detail_names || []);
          setLoaiOptions((res.parent_names || []).filter(n => detailSet.has(n)));
        }
      } catch (err) {
        console.warn('Lỗi lấy gợi ý tên thành phẩm:', err);
      }
    };
    load();
  }, []);

  // Đồng bộ dòng sản phẩm gốc (STT 1) với thông tin form chung
  useEffect(() => {
    setBomRows(prev => {
      if (prev.length === 0) return prev;
      const root = prev[0];
      const len = formData.length || '';
      const wid = formData.width || '';
      const hgt = formData.height || '';
      const spec = [len, wid, hgt].filter(v => v !== '').join('*');
      const compCode = formData.sku || '';
      const compName = formData.name || '';
      if (
        root.compCode === compCode &&
        root.compName === compName &&
        root.spec === spec &&
        root.length === (parseFloat(len) || 0) &&
        root.width === (parseFloat(wid) || 0) &&
        root.height === (parseFloat(hgt) || 0)
      ) return prev;
      const updated = [...prev];
      updated[0] = {
        ...root,
        type: 'Sản phẩm',
        compCode,
        compName,
        spec,
        length: parseFloat(len) || 0,
        width: parseFloat(wid) || 0,
        height: parseFloat(hgt) || 0
      };
      return updated;
    });
  }, [formData.sku, formData.name, formData.length, formData.width, formData.height]);

  const getStageOrderRank = (stageName) => {
    if (!stageName) return 99;
    const s = String(stageName).toLowerCase();
    if (s.includes('phôi') || s.includes('cắt')) return 1;
    if (s.includes('định hình') || s.includes('chà') || s.includes('nhám')) return 2;
    if (s.includes('lắp ráp') || s.includes('lắp')) return 3;
    if (s.includes('sơn')) return 4;
    if (s.includes('qc') || s.includes('kiểm')) return 4.5;
    if (s.includes('đóng gói') || s.includes('gói')) return 5;
    if (s.includes('kho') || s.includes('lưu kho') || s.includes('xuất')) return 6;
    return 10;
  };

  const normalizeStageName = (stageName, prefix = '') => {
    if (!stageName) return '';
    let s = String(stageName).trim();
    const lower = s.toLowerCase();
    if (s.startsWith('NM1') || s.startsWith('NM2') || s.startsWith('NM3')) {
      return s;
    }
    if (prefix) {
      const pNum = prefix.replace('NM', '');
      if (lower.includes('phôi') || lower.includes('cắt')) return `${prefix} - Tạo phôi ${pNum}`;
      if (lower.includes('định hình')) return `${prefix} - Định hình ${pNum}`;
      if (lower.includes('chà') || lower.includes('nhám')) return `${prefix} - Chà nhám ${pNum}`;
      if (lower.includes('lắp ráp') || lower.includes('lắp')) return `${prefix} - Lắp ráp ${pNum}`;
      if (lower.includes('sơn')) return `${prefix} - Sơn ${pNum}`;
      if (lower.includes('đóng gói') || lower.includes('gói')) return `${prefix} - Đóng gói ${pNum}`;
    }
    return s;
  };

  // Tự động rút trích và CHUẨN HÓA KHÔNG TRÙNG LẶP các Công đoạn theo thứ tự quy trình chuẩn
  const createMainStages = useMemo(() => {
    let factoryPrefix = '';
    (bomRows || []).forEach(r => {
      const str = `${r.stageFrom || ''} ${r.stageTo || ''}`;
      const match = str.match(/NM[1-3]/);
      if (match && !factoryPrefix) {
        factoryPrefix = match[0];
      }
    });

    const stageMap = new Map();

    (bomRows || []).forEach(row => {
      [row.stageFrom, row.stageTo].forEach(rawStage => {
        if (!rawStage || !rawStage.trim()) return;
        const norm = normalizeStageName(rawStage.trim(), factoryPrefix);
        const rank = getStageOrderRank(norm);
        if (rank >= 6) return;
        const key = Math.floor(rank);

        if (!stageMap.has(key) || (norm.includes('NM') && !stageMap.get(key).includes('NM'))) {
          stageMap.set(key, norm);
        }
      });
    });

    const result = Array.from(stageMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);

    if (result.length === 0) {
      const p = factoryPrefix || 'NM3';
      const pNum = p.replace('NM', '');
      return [`${p} - Tạo phôi ${pNum}`, `${p} - Định hình ${pNum}`, `${p} - Lắp ráp ${pNum}`, `${p} - Sơn ${pNum}`, `${p} - Đóng gói ${pNum}`];
    }

    return result;
  }, [bomRows]);

  useEffect(() => {
    if (createMainStages.length > 0 && (!activeStage || !createMainStages.includes(activeStage))) {
      setActiveStage(createMainStages[0]);
    }
  }, [createMainStages, activeStage]);

  // Danh mục dòng hàng mặc định từ BOM làm fallback
  const defaultBomLines = [
    'APT', 'ATL', 'FOL', 'ADV',
    'TPH', 'HOR', 'EYC', 'COV',
    'TIN', 'BEZ', 'MBC'
  ];

  // Danh sách Công đoạn sản xuất chuẩn
  const defaultStageOptions = [
    'Tạo phôi',
    'Định hình',
    'Chà nhám',
    'Sơn',
    'Sơn Pallet',
    'Sơn treo',
    'Lắp ráp',
    'QC / Kiểm định',
    'Đóng gói',
    'Lưu kho'
  ];

  // Lấy danh sách Dòng hàng từ API Backend (/master-categories/ hoặc /categories)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let res = await api.get('/master-categories/').catch(() => null);
        if (!res || !Array.isArray(res) || res.length === 0) {
          res = await api.get('/categories').catch(() => []);
        }
        const dataList = Array.isArray(res) ? res : (res?.data || []);
        if (dataList.length > 0) {
          const list = dataList.map(c => {
            const rawName = typeof c === 'string' ? c : (c.name || '');
            const cleanName = rawName.replace(/^Dòng hàng\s*/i, '').trim();
            return typeof c === 'string' ? { name: cleanName } : { ...c, name: cleanName };
          });
          setCategoriesOptions(list);
          setFormData(prev => {
            if (!prev.line || prev.line === 'Nội thất' || !list.some(l => l.name === prev.line)) {
              return { ...prev, line: list[0].name };
            }
            return prev;
          });
        } else {
          setCategoriesOptions(defaultBomLines.map(name => ({ name })));
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách dòng hàng từ API:', err);
        setCategoriesOptions(defaultBomLines.map(name => ({ name })));
      }
    };
    fetchCategories();
  }, []);

  // Tự động nhận diện Dòng hàng dựa trên tiền tố SKU (APT, ATL, ADV, FOL...)
  useEffect(() => {
    if (!formData.sku) return;
    const skuUpper = formData.sku.toUpperCase();
    const matchedLine = (categoriesOptions.length > 0 ? categoriesOptions : defaultBomLines.map(name => ({ name }))).find(cat => {
      const catNameUpper = (cat && cat.name) ? String(cat.name).toUpperCase() : '';
      const prefix = skuUpper.slice(0, 3);
      return catNameUpper.includes(prefix);
    });
    if (matchedLine) {
      setFormData(prev => ({ ...prev, line: matchedLine.name }));
    }
  }, [formData.sku, categoriesOptions]);


  // Thiết lập Title & Header Navigation Bar
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý sản phẩm');
    if (setCustomSubtitle) setCustomSubtitle('KT03.Create: Thêm mới sản phẩm');
    if (setCustomScreenCode) setCustomScreenCode('KT03.1');
    if (setHeaderExtra) {
      setHeaderExtra(
        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          style={{
            padding: '7px 16px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #5D3B32',
            borderRadius: '8px',
            color: '#5D3B32',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5D3B32';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.color = '#5D3B32';
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
        </button>
      );
    }
    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, navigate]);

  // Cập nhật giá trị ô input Form thông tin chung
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Cập nhật dòng BOM (hỗ trợ cả cặp key-value đơn lẻ hoặc object nhiều trường)
  const updateBomRow = (id, fieldOrUpdates, value) => {
    setBomRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null) {
        return { ...row, ...fieldOrUpdates };
      }
      return { ...row, [fieldOrUpdates]: value };
    }));
  };

  // Thêm dòng BOM chính (Bậc 1)
  const handleAddMainBomRow = () => {
    const rootNums = bomRows
      .map(r => r.stt ? parseInt(r.stt.split('.')[0]) : 0)
      .filter(n => !isNaN(n) && n > 0);
    const nextStt = String(rootNums.length > 0 ? Math.max(...rootNums) + 1 : 1);
    const newRow = {
      id: Date.now(),
      stt: nextStt,
      type: 'Sản phẩm',
      stageFrom: 'Định hình',
      stageTo: 'Lắp ráp',
      compCode: `${formData.sku || 'SKU'}.${nextStt}`,
      compName: '',
      quantity: '1',
      unit: 'Cái',
      material: 'Gỗ Sồi',
      spec: '',
      volume: '1',
      length: 0,
      width: 0,
      height: 0,
      waste_ratio: 0,
      note: ''
    };
    setBomRows(prev => [...prev, newRow]);
    if (toast) toast('success', 'Đã thêm 1 dòng chi tiết mới!');
  };

  // Thêm chi tiết con phân cấp (Sub-component STT 1.1, 1.1.1...)
  const handleAddSubBomRow = (parentRow) => {
    const parentStt = parentRow.stt || '1';
    const prefix = `${parentStt}.`;
    const directSiblings = bomRows.filter(r => r.stt && r.stt.startsWith(prefix) && r.stt.slice(prefix.length).indexOf('.') === -1);
    const subNums = directSiblings
      .map(r => parseInt(r.stt.slice(prefix.length)))
      .filter(n => !isNaN(n) && n > 0);
    const nextSubNum = subNums.length > 0 ? Math.max(...subNums) + 1 : 1;
    const newStt = `${parentStt}.${nextSubNum}`;

    const newRow = {
      id: Date.now(),
      stt: newStt,
      type: parentRow.compName || 'Chi tiết',
      stageFrom: 'Tạo phôi',
      stageTo: 'Định hình',
      compCode: `${formData.sku || 'SKU'}.${newStt}`,
      compName: '',
      quantity: '1',
      unit: 'Cái',
      material: 'Gỗ / MDF',
      spec: '',
      volume: '1',
      length: 0,
      width: 0,
      height: 0,
      waste_ratio: 0,
      note: ''
    };

    let insertIndex = bomRows.findIndex(r => r.id === parentRow.id);
    for (let i = insertIndex + 1; i < bomRows.length; i++) {
      if (bomRows[i].stt && bomRows[i].stt.startsWith(prefix)) {
        insertIndex = i;
      } else {
        break;
      }
    }
    const updated = [...bomRows];
    updated.splice(insertIndex + 1, 0, newRow);
    setBomRows(updated);
    if (toast) toast('info', `Đã thêm chi tiết cấp con (${newStt})`);
  };

  const handleAddComponentSuccess = (newDetail) => {
    const { parentId, parentStt: pStt } = newDetail;

    setBomRows(prev => {
      let parentStt = pStt || '';
      if (!parentStt && parentId) {
        const parent = prev.find(r => String(r.id) === String(parentId) || r.compCode === parentId);
        if (parent) parentStt = parent.stt;
      }
      // Nếu không chọn cha, mặc định là dòng sản phẩm gốc (STT 1)
      if (!parentStt && prev.length > 0) {
        parentStt = prev[0].stt;
      }

      let newStt;
      if (!parentStt) {
        const maxRoot = prev
          .filter(r => !r.stt.includes('.'))
          .map(r => parseInt(r.stt, 10))
          .filter(n => !isNaN(n));
        const nextRoot = (maxRoot.length ? Math.max(...maxRoot) : 0) + 1;
        newStt = String(nextRoot);
      } else {
        const siblings = prev.filter(r => r.stt.startsWith(`${parentStt}.`) && r.stt.split('.').length === parentStt.split('.').length + 1);
        const nextSubNum = siblings.length + 1;
        newStt = `${parentStt}.${nextSubNum}`;
      }

      const newRow = {
        id: Date.now(),
        stt: newStt,
        type: newDetail.type || 'Chi tiết',
        stageFrom: newDetail.inputStage || 'Định hình',
        stageTo: newDetail.outputStage || 'Lắp ráp',
        compCode: `${formData.sku || 'SKU'}.${newStt}`,
        compName: newDetail.detailName,
        quantity: String(newDetail.quantity || 1),
        unit: newDetail.unit || 'Cái',
        material: newDetail.material || 'Gỗ / MDF',
        spec: newDetail.specStr || '',
        volume: String(newDetail.volume || 1),
        length: parseFloat(newDetail.length) || 0,
        width: parseFloat(newDetail.width) || 0,
        height: parseFloat(newDetail.height) || 0,
        waste_ratio: 0,
        note: newDetail.note || ''
      };

      if (!parentId) {
        return [...prev, newRow];
      }
      const parentIndex = prev.findIndex(r => String(r.id) === String(parentId) || r.compCode === parentId);
      const updated = [...prev];
      if (parentIndex !== -1) {
        updated.splice(parentIndex + 1, 0, newRow);
      } else {
        updated.push(newRow);
      }
      return updated;
    });

    setFormData(prev => ({ ...prev, totalComponents: String(bomRows.length + 1) }));
    if (toast) toast('success', `Đã thêm chi tiết ${newDetail.detailName}`);
  };

  // Xóa dòng BOM
  const handleRemoveBomRow = (id) => {
    if (bomRows.length === 1) {
      if (toast) toast('warning', 'Phải giữ lại ít nhất 1 dòng chi tiết');
      return;
    }
    setBomRows(prev => prev.filter(row => row.id !== id));
  };

  // Xử lý Dán từ Excel (Paste Modal)
  const handlePasteExcel = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split('\n');
    let firstRowProductInfo = null;

    const newRows = lines.map((line, index) => {
      const cells = line.split('\t');
      if (cells.length < 3) return null;

      // Nhận diện đơn vị mốc
      let uIdx = -1;
      const unitKeywords = ['cái', 'm3', 'bộ', 'pcs', 'mét', 'kg', 'tấm', 'thanh'];
      for (let i = 0; i < Math.min(cells.length, 15); i++) {
        const val = (cells[i] || '').toLowerCase().trim();
        if (unitKeywords.includes(val)) {
          uIdx = i;
          break;
        }
      }

      const unitIdx = uIdx > 0 ? uIdx : 5;
      const nameIdx = unitIdx - 1;
      const skuIdx = unitIdx - 2 >= 0 ? unitIdx - 2 : 0;
      const specIdx = unitIdx + 1;
      const qtyIdx = unitIdx + 2;

      const childSku = cells[skuIdx]?.trim() || '';
      const childName = cells[nameIdx]?.trim() || cells[1]?.trim() || '';
      const childUnit = cells[unitIdx]?.trim() || 'Cái';

      if (!childName || childName === 'Tên chi tiết' || childName === 'Tên thành phẩm' || childName === 'Tên mặt hàng') return null;

      if (!firstRowProductInfo && cells[0] && cells[1]) {
        firstRowProductInfo = {
          sku: cells[0].trim(),
          name: cells[1].trim()
        };
      }

      const sttVal = cells[0]?.trim() || String(index + 1);

      return {
        id: Date.now() + index,
        stt: sttVal,
        type: 'Chi tiết',
        stageFrom: (cells[cells.length - 2] || '').trim() || 'Định hình',
        stageTo: (cells[cells.length - 1] || '').trim() || 'Lắp ráp',
        compCode: childSku || `SKU-${index + 1}`,
        compName: childName,
        quantity: parseFloat(cells[qtyIdx]) || 1,
        unit: childUnit,
        material: cells[specIdx] || 'Gỗ / MDF',
        spec: cells[specIdx] || '',
        volume: '1',
        note: ''
      };
    }).filter(r => r !== null);

    if (newRows.length > 0) {
      if (firstRowProductInfo) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || firstRowProductInfo.name,
          sku: prev.sku || firstRowProductInfo.sku
        }));
      }
      setBomRows(newRows);
      setShowPasteModal(false);
      setPasteText('');
      if (toast) toast('success', `Đã dán thành công ${newRows.length} dòng dữ liệu từ Excel!`);
    } else {
      if (toast) toast('warning', 'Không nhận diện được định dạng dòng từ Excel');
    }
  };

  // Upload Ảnh chính và Thumbnail
  const handleImageUpload = (e, isMain = true, thumbIndex = 0) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isMain) {
        setMainImage(reader.result);
      } else {
        setSubImages(prev => {
          const updated = [...prev];
          updated[thumbIndex] = reader.result;
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Lọc danh sách BOM hiển thị theo từ khóa tìm kiếm
  const filteredBomRows = useMemo(() => {
    if (!searchTerm.trim()) return bomRows;
    const term = searchTerm.toLowerCase().trim();
    return bomRows.filter(r =>
      r.stt.toLowerCase().includes(term) ||
      (r.type && r.type.toLowerCase().includes(term)) ||
      (r.compCode && r.compCode.toLowerCase().includes(term)) ||
      (r.compName && r.compName.toLowerCase().includes(term)) ||
      (r.material && r.material.toLowerCase().includes(term))
    );
  }, [bomRows, searchTerm]);

  // Xử lý gửi Form tạo mới sản phẩm sang Backend API (/master-products/)
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.sku.trim()) {
      if (toast) toast('warning', 'Vui lòng nhập Mã sản phẩm (SKU) và Tên sản phẩm!');
      return;
    }

    setLoading(true);
    try {
      const matchedCategory = categoriesOptions.find(c => c.name === formData.line || c.name === formData.category);
      const parsedPrice = parseFloat(String(formData.estimatedCost || '0').replace(/\./g, '').replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
      const payload = {
        name: formData.name,
        sku: formData.sku,
        brand_name: formData.line,
        category_id: matchedCategory?.id || null,
        price: parsedPrice,
        color: formData.color,
        length: parseFloat(formData.length) || 0,
        width: parseFloat(formData.width) || 0,
        height: parseFloat(formData.height) || 0,
        weight: parseFloat(String(formData.weight || '0').replace(/[^\d.]/g, '')) || 0,
        quantity: parseFloat(formData.totalComponents) || 1.0,
        unit: 'Bộ',
        specification: formData.note,
        description: formData.note,
        status: formData.bomStatus,
        master_bom_details: bomRows
          .filter(r => (r.compName && r.compName.trim() !== '') || (r.compCode && r.compCode.trim() !== ''))
          .map(r => ({
            tree_stt: r.stt,
            sku: r.compCode || r.sku,
            component_sku: r.compCode || r.sku,
            name: r.compName || r.name || 'Chi tiết',
            component_type: r.type,
            quantity: parseFloat(r.quantity) || 1,
            unit: r.unit || 'Cái',
            material: r.material || 'Gỗ / MDF',
            specification: r.spec || '',
            input_stage: r.stageFrom,
            output_stage: r.stageTo,
            description: r.note || ''
          })),
        product_details: detailRows,
        paint_color_samples: paintColorRows
      };

      const res = await api.post('/master-products/', payload);
      if (toast) toast('success', 'Tạo sản phẩm mẫu mới thành công!');

      // Điều hướng về trang chi tiết sản phẩm vừa tạo hoặc danh sách
      if (res && res.id) {
        navigate(`/admin/products/${res.id}`);
      } else {
        navigate('/admin/products');
      }
    } catch (err) {
      console.error('Lỗi khi khởi tạo sản phẩm:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi lưu dữ liệu sản phẩm mới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mgmt-container" style={{ backgroundColor: '#FAF6F1', minHeight: '100vh', padding: '12px 16px' }}>
      <div className="mgmt-main" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* KHUNG 1: THÔNG TIN CHUNG (CHUẨN MOCKUP 1 - 100% GIỐNG TRANG DETAIL) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          padding: '12px 18px',
          boxShadow: '0 2px 10px rgba(45, 26, 18, 0.03)'
        }}>
          {/* Header Card + 5 Nút Thao Tác Bên Phải */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12' }}>
              Thông tin chung sản phẩm mới
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (toast) toast('info', 'Chức năng lấy từ sản phẩm khác đang phát triển');
                }}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#EADCC9',
                  border: '1px solid #C4B5A5',
                  borderRadius: '8px',
                  color: '#5D3B32',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={15} /> Lấy từ sản phẩm khác
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#8D6E63',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={15} /> Dán từ Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (toast) toast('info', 'Xuất file dữ liệu mẫu');
                }}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#8D6E63',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={15} /> Xuất file mẫu
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: '7px 18px',
                  backgroundColor: '#5D3B32',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(93, 59, 50, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={15} /> {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
              </button>
            </div>
          </div>

          {/* Hàng 1 + Hàng 2: Bố cục Khung Ảnh & Form 7 Ô Nhập */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', marginBottom: '10px' }}>

            {/* Khung Ảnh Sản Phẩm (Ảnh chính + 3 Thumbnail Phụ xếp dọc bên phải) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={(e) => handleImageUpload(e, true)}
              />

              {/* Ô ảnh chính vuông lớn */}
              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  width: '240px',
                  height: '165px',
                  backgroundColor: '#F8FAFC',
                  border: mainImage ? '1.5px solid #5D3B32' : '1.5px dashed #CBD5E1',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {mainImage ? (
                  <img src={mainImage} alt="Main Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Box size={52} style={{ strokeWidth: 1.5 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', marginTop: '4px' }}>Tải ảnh chính</span>
                  </>
                )}
              </div>

              {/* 3 Ô ảnh thumbnail nhỏ xếp dọc bên phải */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-between' }}>
                {[0, 1, 2].map((thumbIdx) => (
                  <div
                    key={thumbIdx}
                    style={{
                      width: '64px',
                      height: '51px',
                      backgroundColor: '#F8FAFC',
                      border: subImages[thumbIdx] ? '1px solid #5D3B32' : '1px solid #CBD5E1',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#CBD5E1',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {subImages[thumbIdx] ? (
                      <img src={subImages[thumbIdx]} alt={`Thumb ${thumbIdx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Box size={22} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields: Hàng 1 & Hàng 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Hàng 1: Mã SP | Danh mục | Dòng hàng | Tên sản phẩm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr 3fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Mã sản phẩm (SKU) *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Vd: ADV014"
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '800', color: '#1F2937', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
                  >
                    <option value="Tủ quần áo">Tủ quần áo</option>
                    <option value="Tủ trưng bày">Tủ trưng bày</option>
                    <option value="Bàn ăn">Bàn ăn</option>
                    <option value="Ghế nội thất">Ghế nội thất</option>
                    <option value="Bàn làm việc">Bàn làm việc</option>
                    <option value="Giường ngủ">Giường ngủ</option>
                    <option value="Kệ tivi">Kệ tivi</option>
                    <option value="Bàn trang điểm">Bàn trang điểm</option>
                    <option value="Tủ bếp">Tủ bếp</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Dòng hàng (BOM Master)</label>
                  <select
                    value={formData.line}
                    onChange={(e) => handleInputChange('line', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
                  >
                    {(categoriesOptions.length > 0 ? categoriesOptions : defaultBomLines.map(name => ({ name }))).map(cat => (
                      <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Vd: Oslo Barstool Solid seat"
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#2D1A12', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Hàng 2: Kích thước tổng thể (3 ô) | Khối lượng | Ghi chú */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 3.5fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Kích thước tổng thể (mm)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <input
                      type="number"
                      placeholder="Dài"
                      value={formData.length}
                      onChange={(e) => handleInputChange('length', e.target.value)}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                    <input
                      type="number"
                      placeholder="Rộng"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', e.target.value)}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                    <input
                      type="number"
                      placeholder="Cao"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Khối lượng (kg)</label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="Vd: 25"
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Ghi chú sản phẩm</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => handleInputChange('note', e.target.value)}
                    placeholder="Ghi chú kỹ thuật..."
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '600', color: '#334155', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Hàng 3: Hàng Thông Tin Meta 6 Ô Nền Xám (100% Giống Detail) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Ngày tạo</label>
              <input
                type="text"
                readOnly
                value={formData.updatedAt}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '700', color: '#334155', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Người tạo</label>
              <input
                type="text"
                readOnly
                value={formData.updatedBy}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '700', color: '#334155', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Trạng thái BOM</label>
              <select
                value={formData.bomStatus}
                onChange={(e) => handleInputChange('bomStatus', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '700', color: '#166534', outline: 'none' }}
              >
                <option value="Mới tạo">Mới tạo</option>
                <option value="Đang soạn thảo">Đang soạn thảo</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đã duyệt">Đã duyệt</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Tổng số chi tiết</label>
              <input
                type="text"
                readOnly
                value={bomRows.length}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '800', color: '#2D1A12', outline: 'none', textAlign: 'center' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Ước tính chi phí</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={formData.estimatedCost}
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/\D/g, '');
                    const formatted = rawDigits ? Number(rawDigits).toLocaleString('vi-VN') : '';
                    handleInputChange('estimatedCost', formatted);
                  }}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '7px 48px 7px 10px',
                    border: '1.5px solid #D1D5DB',
                    borderRadius: '7px',
                    backgroundColor: '#FFF',
                    fontWeight: '700',
                    color: '#1F2937',
                    outline: 'none'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '10px',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  color: '#9CA3AF',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  VNĐ
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Màu sắc</label>
              <select
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
              >
                <option value="Màu tự nhiên">Màu tự nhiên</option>
                <option value="WOA">WOA (Gỗ Sồi Tự Nhiên)</option>
                <option value="GRY">GRY (Gỗ Sơn Xám)</option>
                <option value="BLK">BLK (Gỗ Sơn Đen)</option>
                <option value="VGN">VGN (Veneer Tự Nhiên)</option>
                <option value="MCA">MCA (Màu Cánh Gián)</option>
                <option value="F216">F216 (Sơn Phủ PU)</option>
                <option value="WUT">WUT (Màu Óc Chó Walnut)</option>
              </select>
            </div>
          </div>

        </div>

        {/* KHUNG 2: THANH 4 TAB NỔI BẬT */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid #EADCC9', paddingLeft: '4px', marginBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('bom')}
            style={{
              padding: '8px 4px',
              backgroundColor: 'transparent',
              color: activeTab === 'bom' ? '#5D3B32' : '#6B7280',
              border: 'none',
              borderBottom: activeTab === 'bom' ? '3px solid #5D3B32' : '3px solid transparent',
              fontWeight: activeTab === 'bom' ? '800' : '600',
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            BOM sản phẩm
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('process')}
            style={{
              padding: '8px 4px',
              backgroundColor: 'transparent',
              color: activeTab === 'process' ? '#5D3B32' : '#6B7280',
              border: 'none',
              borderBottom: activeTab === 'process' ? '3px solid #5D3B32' : '3px solid transparent',
              fontWeight: activeTab === 'process' ? '800' : '600',
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Quy trình thực hiện
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drawings')}
            style={{
              padding: '8px 4px',
              backgroundColor: 'transparent',
              color: activeTab === 'drawings' ? '#5D3B32' : '#6B7280',
              border: 'none',
              borderBottom: activeTab === 'drawings' ? '3px solid #5D3B32' : '3px solid transparent',
              fontWeight: activeTab === 'drawings' ? '800' : '600',
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Bản vẽ kỹ thuật
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            style={{
              padding: '8px 4px',
              backgroundColor: 'transparent',
              color: activeTab === 'materials' ? '#5D3B32' : '#6B7280',
              border: 'none',
              borderBottom: activeTab === 'materials' ? '3px solid #5D3B32' : '3px solid transparent',
              fontWeight: activeTab === 'materials' ? '800' : '600',
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}
          >
            Định mức vật tư
          </button>
        </div>

        {/* NỘI DUNG CỦA TAB BOM */}
        {activeTab === 'bom' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* THANH ACTION TOOLBAR PHÍA TRÊN BẢNG BOM */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1.5px solid #EADCC9',
              padding: '10px 16px',
              boxShadow: '0 2px 8px rgba(45,26,18,0.02)',
              width: '100%',
              gap: '12px'
            }}>
              {/* BÊN TRÁI: Ô tìm kiếm, Icon Sort A-Z, Icon Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 34px',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                </div>

                <button
                  type="button"
                  onClick={() => { if (toast) toast('info', 'Sắp xếp danh sách'); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#4B5563', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowUpDown size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => { if (toast) toast('info', 'Bộ lọc nâng cao'); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#4B5563', display: 'flex', alignItems: 'center' }}
                >
                  <Filter size={18} />
                </button>
              </div>

              {/* BÊN PHẢI: 4 Nút Nâu Đậm (#5D3B32) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>

                {/* NÚT CẤU HÌNH THÔNG TIN */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsConfigDropdownOpen(!isConfigDropdownOpen)}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: '#5D3B32',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sliders size={15} /> Cấu hình thông tin
                  </button>

                  {isConfigDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '6px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 100,
                      minWidth: '210px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfigDropdownOpen(false);
                          navigate('/admin/product-details');
                        }}
                        style={{
                          padding: '11px 16px',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          color: '#2D1A12',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          borderBottom: '1px solid #FAF6F0'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        KT03.1: Quản lý Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfigDropdownOpen(false);
                          navigate('/admin/paint-colors');
                        }}
                        style={{
                          padding: '11px 16px',
                          border: 'none',
                          background: 'transparent',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          color: '#2D1A12',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        KT03.3: Quản lý Mẫu sơn
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileSpreadsheet size={15} /> Dán từ Excel
                </button>

                {/* NÚT + THÊM MỚI (Dropdown Thêm dòng chi tiết chính) */}
                <button
                  type="button"
                  onClick={() => setShowAddComponentModal(true)}
                  style={{
                    padding: '7px 16px',
                    backgroundColor: '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 8px rgba(93, 59, 50, 0.2)'
                  }}
                >
                  <Plus size={15} /> Thêm chi tiết
                </button>

              </div>
            </div>

            {/* BẢNG BOM PHÂN CẤP CHUẨN 13 CỘT (MOCKUP 1) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(45,26,18,0.03)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F5EBE1', borderBottom: '2px solid #EADCC9', color: '#2D1A12' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px', fontWeight: '800' }}>STT</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px', fontWeight: '800' }}>Loại</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px', fontWeight: '800' }}>Công đoạn giao</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px', fontWeight: '800' }}>Công đoạn nhận</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '240px', fontWeight: '800' }}>Mã thành phẩm</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '180px', fontWeight: '800' }}>Tên thành phẩm *</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '65px', fontWeight: '800' }}>Số lượng</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '70px', fontWeight: '800' }}>Đơn vị</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '120px', fontWeight: '800' }}>Vật liệu</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '140px', fontWeight: '800' }}>Quy cách (mm)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px', fontWeight: '800' }}>Khối lượng (m3)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', width: '120px', fontWeight: '800' }}>Ghi chú</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px', fontWeight: '800' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBomRows.map((row, index) => {
                      const isRootRow = (index === 0);
                      const levelDepth = row.stt ? (row.stt.split('.').length - 1) : 0;
                      const effectiveSuggestions = (row.type && suggestionsByParent[row.type]?.length > 0)
                        ? suggestionsByParent[row.type]
                        : detailSuggestions;
                      return (
                        <tr key={row.id || index} style={{ borderBottom: '1px solid #FAF6F0', backgroundColor: isRootRow ? '#FDFBF7' : (index % 2 === 0 ? '#FFFFFF' : '#FFFCF9') }}>
                          {/* STT */}
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#5D3B32' }}>
                            <input
                              type="text"
                              value={row.stt || ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => {
                                if (isRootRow) return;
                                const numericDotVal = e.target.value.replace(/[^0-9.]/g, '').replace(/\.{2,}/g, '.');
                                updateBomRow(row.id, 'stt', numericDotVal);
                              }}
                              onKeyDown={(e) => {
                                if (isRootRow) return;
                                if (['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'].includes(e.key) || e.ctrlKey || e.metaKey) {
                                  return;
                                }
                                if (!/[0-9.]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              placeholder="1.1"
                              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: '800', color: '#5D3B32', cursor: isRootRow ? 'default' : 'text' }}
                            />
                          </td>

                          {/* Loại */}
                          <td style={{ padding: '8px' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                id={`loai-input-${row.id}`}
                                type="text"
                                value={row.type}
                                readOnly={isRootRow}
                                disabled={isRootRow}
                                onChange={(e) => {
                                  if (isRootRow) return;
                                  updateBomRow(row.id, 'type', e.target.value);
                                  if (levelDepth > 0) setActiveTypeRow(row.id);
                                }}
                                onFocus={() => {
                                  if (isRootRow || levelDepth === 0) return;
                                  setActiveTypeRow(row.id);
                                  const el = document.getElementById(`loai-input-${row.id}`);
                                  if (el) {
                                    const rect = el.getBoundingClientRect();
                                    const dropdownHeight = 400;
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const top = spaceBelow < dropdownHeight
                                      ? rect.top + window.scrollY - dropdownHeight
                                      : rect.bottom + window.scrollY;
                                    setLoaiDropdownStyle({
                                      top,
                                      left: rect.left + window.scrollX,
                                      minWidth: Math.max(rect.width, 240)
                                    });
                                  }
                                }}
                                onBlur={() => {
                                  if (isRootRow || levelDepth === 0) return;
                                  setTimeout(() => {
                                    if (selectingTypeRef.current) return;
                                    const exact = loaiOptions.find(o => o.toLowerCase() === (row.type || '').trim().toLowerCase());
                                    if (exact) {
                                      updateBomRow(row.id, 'type', exact);
                                      loadSuggestionsForParent(exact);
                                    }
                                    setActiveTypeRow(null);
                                  }, 150);
                                }}
                                placeholder="Chi tiết..."
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                  color: isRootRow ? '#4B5563' : '#1F2937',
                                  fontWeight: isRootRow ? '700' : 'normal',
                                  cursor: isRootRow ? 'not-allowed' : 'text'
                                }}
                              />
                              {!isRootRow && activeTypeRow === row.id && levelDepth > 0 && (() => {
                                const query = (row.type || '').toLowerCase().trim();
                                const filtered = query
                                  ? loaiOptions.filter(o => o.toLowerCase().includes(query)).slice(0, 100)
                                  : loaiOptions.slice(0, 100);
                                if (filtered.length === 0) return null;
                                return (
                                  <div style={{
                                    position: 'fixed', top: loaiDropdownStyle.top, left: loaiDropdownStyle.left,
                                    minWidth: loaiDropdownStyle.minWidth, width: 'max-content', whiteSpace: 'nowrap',
                                    backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                                    boxShadow: '0 8px 16px rgba(45, 26, 18, 0.15)', maxHeight: '400px', overflowY: 'auto', zIndex: 9999
                                  }}>
                                    {filtered.map((opt, idx) => (
                                      <div
                                        key={idx}
                                        onMouseDown={() => {
                                          selectingTypeRef.current = true;
                                          updateBomRow(row.id, 'type', opt);
                                          loadSuggestionsForParent(opt);
                                          setActiveTypeRow(null);
                                          setTimeout(() => { selectingTypeRef.current = false; }, 300);
                                        }}
                                        style={{
                                          padding: '8px 12px', fontSize: '0.82rem', fontWeight: '600', color: '#2D1A12',
                                          cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                                      >
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* CĐ Vào */}
                          <td style={{ padding: '8px' }}>
                            <select
                              value={row.stageFrom || 'Tạo phôi'}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'stageFrom', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFF',
                                fontWeight: '600',
                                color: isRootRow ? '#4B5563' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              {Array.from(new Set([...defaultStageOptions, row.stageFrom].filter(Boolean))).map((stg) => (
                                <option key={stg} value={stg}>{stg}</option>
                              ))}
                            </select>
                          </td>

                          {/* CĐ Ra */}
                          <td style={{ padding: '8px' }}>
                            <select
                              value={row.stageTo || 'Đóng gói'}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'stageTo', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFF',
                                fontWeight: '600',
                                color: isRootRow ? '#4B5563' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              {Array.from(new Set([...defaultStageOptions, row.stageTo].filter(Boolean))).map((stg) => (
                                <option key={stg} value={stg}>{stg}</option>
                              ))}
                            </select>
                          </td>

                          {/* Mã thành phẩm */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={row.compCode || ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'compCode', e.target.value)}
                              placeholder="Mã TP..."
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                color: isRootRow ? '#1F2937' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Tên thành phẩm (Hiệu ứng thụt lề cấp bậc) */}
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {[...Array(levelDepth)].map((_, i) => (
                                <div key={i} style={{ width: '14px', height: '1px', borderBottom: '1px dashed #C4B5A5' }} />
                              ))}
                              <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                  id={`compname-input-${row.id}`}
                                  type="text"
                                  value={row.compName || ''}
                                  readOnly={isRootRow}
                                  disabled={isRootRow}
                                  onChange={(e) => {
                                    if (isRootRow) return;
                                    updateBomRow(row.id, 'compName', e.target.value);
                                    if (levelDepth > 0) setActiveCompNameRow(row.id);
                                  }}
                                  onFocus={() => {
                                    if (isRootRow || levelDepth === 0) return;
                                    setActiveCompNameRow(row.id);
                                    const el = document.getElementById(`compname-input-${row.id}`);
                                    if (el) {
                                      const rect = el.getBoundingClientRect();
                                      const dropdownHeight = 400;
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const top = spaceBelow < dropdownHeight
                                        ? rect.top + window.scrollY - dropdownHeight
                                        : rect.bottom + window.scrollY;
                                      setCompNameDropdownStyle({
                                        top,
                                        left: rect.left + window.scrollX,
                                        minWidth: Math.max(rect.width, 240)
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    if (isRootRow || levelDepth === 0) return;
                                    setTimeout(() => {
                                      if (selectingCompNameRef.current) return;
                                      const match = effectiveSuggestions.find(s => s.toLowerCase() === (row.compName || '').trim().toLowerCase());
                                      if (match) {
                                        const meta = detailMetaMap[match] || {};
                                        const updates = {
                                          compName: match,
                                          unit: meta.unit || row.unit || 'Cái',
                                          material: meta.material || row.material || 'Gỗ / MDF',
                                          stageFrom: meta.input_stage || row.stageFrom || 'Tạo phôi',
                                          stageTo: meta.output_stage || row.stageTo || 'Đóng gói'
                                        };
                                        if (meta.length != null) updates.length = parseFloat(meta.length) || 0;
                                        if (meta.width != null) updates.width = parseFloat(meta.width) || 0;
                                        if (meta.height != null) updates.height = parseFloat(meta.height) || 0;
                                        if (meta.volume != null) updates.volume = parseFloat(meta.volume) || 0;
                                        updateBomRow(row.id, updates);
                                      }
                                      setActiveCompNameRow(null);
                                    }, 150);
                                  }}
                                  placeholder="Tên thành phẩm..."
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: levelDepth === 0 ? '700' : '400',
                                    backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                    color: levelDepth === 0 ? '#5D3B32' : '#1F2937',
                                    cursor: isRootRow ? 'not-allowed' : 'text'
                                  }}
                                />
                                {!isRootRow && activeCompNameRow === row.id && levelDepth > 0 && (() => {
                                  const query = (row.compName || '').toLowerCase().trim();
                                  const filtered = query
                                    ? effectiveSuggestions.filter(s => s.toLowerCase().includes(query)).slice(0, 100)
                                    : effectiveSuggestions.slice(0, 100);
                                  if (filtered.length === 0) return null;
                                  return (
                                    <div style={{
                                      position: 'fixed', top: compNameDropdownStyle.top, left: compNameDropdownStyle.left,
                                      minWidth: compNameDropdownStyle.minWidth, width: 'max-content', whiteSpace: 'nowrap',
                                      backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                                      boxShadow: '0 8px 16px rgba(45, 26, 18, 0.15)', maxHeight: '400px', overflowY: 'auto', zIndex: 9999
                                    }}>
                                      {filtered.map((item, idx) => (
                                        <div
                                          key={idx}
                                          onMouseDown={() => {
                                            selectingCompNameRef.current = true;
                                            const meta = detailMetaMap[item] || {};
                                            const updates = {
                                              compName: item,
                                              unit: meta.unit || row.unit || 'Cái',
                                              material: meta.material || row.material || 'Gỗ / MDF',
                                              stageFrom: meta.input_stage || row.stageFrom || 'Tạo phôi',
                                              stageTo: meta.output_stage || row.stageTo || 'Đóng gói'
                                            };
                                            if (meta.length != null) updates.length = parseFloat(meta.length) || 0;
                                            if (meta.width != null) updates.width = parseFloat(meta.width) || 0;
                                            if (meta.height != null) updates.height = parseFloat(meta.height) || 0;
                                            if (meta.volume != null) updates.volume = parseFloat(meta.volume) || 0;
                                            updateBomRow(row.id, updates);
                                            setActiveCompNameRow(null);
                                            setTimeout(() => { selectingCompNameRef.current = false; }, 300);
                                          }}
                                          style={{
                                            padding: '8px 12px', fontSize: '0.82rem', fontWeight: '600', color: '#2D1A12',
                                            cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                                          }}
                                          onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                                          onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                                        >
                                          {item}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>

                          {/* SL */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={row.quantity != null ? row.quantity : ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'quantity', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontWeight: '700',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                color: isRootRow ? '#4B5563' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* ĐVT */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={row.unit || ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'unit', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                textAlign: 'center',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                color: isRootRow ? '#4B5563' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Vật tư / Gỗ */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={row.material || ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'material', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                color: isRootRow ? '#4B5563' : '#1F2937',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Quy cách (mm) */}
                          <td style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <input
                                type="number"
                                placeholder="D"
                                value={row.length || ''}
                                readOnly={isRootRow}
                                disabled={isRootRow}
                                onChange={(e) => {
                                  if (isRootRow) return;
                                  const val = parseFloat(e.target.value) || 0;
                                  const newSpec = [val, row.width || 0, row.height || 0].join('*');
                                  updateBomRow(row.id, { length: val, spec: newSpec });
                                }}
                                style={{
                                  width: '33%',
                                  padding: '3px',
                                  border: '1px solid #E5E7EB',
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                  cursor: isRootRow ? 'not-allowed' : 'text'
                                }}
                              />
                              <input
                                type="number"
                                placeholder="R"
                                value={row.width || ''}
                                readOnly={isRootRow}
                                disabled={isRootRow}
                                onChange={(e) => {
                                  if (isRootRow) return;
                                  const val = parseFloat(e.target.value) || 0;
                                  const newSpec = [row.length || 0, val, row.height || 0].join('*');
                                  updateBomRow(row.id, { width: val, spec: newSpec });
                                }}
                                style={{
                                  width: '33%',
                                  padding: '3px',
                                  border: '1px solid #E5E7EB',
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                  cursor: isRootRow ? 'not-allowed' : 'text'
                                }}
                              />
                              <input
                                type="number"
                                placeholder="C"
                                value={row.height || ''}
                                readOnly={isRootRow}
                                disabled={isRootRow}
                                onChange={(e) => {
                                  if (isRootRow) return;
                                  const val = parseFloat(e.target.value) || 0;
                                  const newSpec = [row.length || 0, row.width || 0, val].join('*');
                                  updateBomRow(row.id, { height: val, spec: newSpec });
                                }}
                                style={{
                                  width: '33%',
                                  padding: '3px',
                                  border: '1px solid #E5E7EB',
                                  textAlign: 'center',
                                  fontSize: '0.75rem',
                                  backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                  cursor: isRootRow ? 'not-allowed' : 'text'
                                }}
                              />
                            </div>
                          </td>

                          {/* Khối lượng (m3) */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={row.volume != null ? row.volume : ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'volume', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                textAlign: 'center',
                                color: '#6B7280',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Ghi chú */}
                          <td style={{ padding: '8px' }}>
                            <input
                              type="text"
                              value={row.note || ''}
                              readOnly={isRootRow}
                              disabled={isRootRow}
                              onChange={(e) => updateBomRow(row.id, 'note', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #E5E7EB',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                backgroundColor: isRootRow ? '#F9FAFB' : '#FFFFFF',
                                cursor: isRootRow ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Thao tác */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleAddSubBomRow(row)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5D3B32', padding: '3px' }}
                                title="Thêm chi tiết con"
                              >
                                <Plus size={15} />
                              </button>
                              {!isRootRow && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBomRow(row.id)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '3px' }}
                                  title="Xóa dòng"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', backgroundColor: '#FFFCF9', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6B7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> Có thể bấm dán dữ liệu từ file Excel (Copy từ cột STT đến Ghi chú)
                </span>
                <span style={{ fontWeight: '700', color: '#5D3B32' }}>Tổng số dòng thành phẩm: {bomRows.length}</span>
              </div>
            </div>

          </div>
        ) : activeTab === 'process' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Khung sơ đồ quy trình dạng ngang */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              padding: '16px 20px',
              boxShadow: '0 2px 10px rgba(45, 26, 18, 0.03)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: '8px',
                padding: '8px 0'
              }}>
                {createMainStages.map((stg, idx) => {
                  const isActive = activeStage === stg;
                  return (
                    <React.Fragment key={stg}>
                      <div
                        onClick={() => setActiveStage(stg)}
                        style={{
                          minWidth: '110px',
                          textAlign: 'center',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          backgroundColor: isActive ? '#A3E635' : '#EADCC9',
                          border: isActive ? '2px solid #65A30D' : '1.5px solid #C4B5A5',
                          color: '#2D1A12',
                          fontWeight: '800',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 4px 10px rgba(163, 230, 53, 0.3)' : 'none',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                      >
                        {stg}
                      </div>
                      {idx < createMainStages.length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4C3D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Bảng chi tiết theo công đoạn được chọn */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.05)',
              marginBottom: '24px'
            }}>
              <div style={{
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 440px)',
                minHeight: '280px',
                borderRadius: '10px',
                paddingBottom: '16px'
              }}>
                <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                      <th style={{ padding: '10px', textAlign: 'center', width: '55px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>STT</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Loại</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Công đoạn giao</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Công đoạn nhận</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Mã thành phẩm</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Tên thành phẩm</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Số lượng</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Đơn vị</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Vật liệu</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const processItems = (bomRows || []).filter(r => !activeStage || r.stageFrom === activeStage || r.stageTo === activeStage);
                      if (processItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontWeight: '600' }}>
                              Không có chi tiết nào trong công đoạn {activeStage}
                            </td>
                          </tr>
                        );
                      }
                      return processItems.map((r, idx) => (
                        <tr key={r.id || idx} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                          <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>{r.stt}</td>
                          <td style={{ padding: '9px 10px', fontWeight: '600', color: '#334155' }}>{r.type || 'Chi tiết'}</td>
                          <td style={{ padding: '9px 10px', color: '#475569' }}>{r.stageFrom || '---'}</td>
                          <td style={{ padding: '9px 10px', color: '#475569' }}>{r.stageTo || '---'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: '800', color: '#2D1A12' }}>{r.compCode || '---'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: '600', color: '#334155' }}>{r.compName || '---'}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{r.quantity || '1'}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'center', color: '#334155' }}>{r.unit || 'Cái'}</td>
                          <td style={{ padding: '9px 10px', color: '#334155' }}>{r.material || '---'}</td>
                          <td style={{ padding: '9px 10px', color: '#94A3B8' }}>{r.note || '---'}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '30px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1.5px solid #EADCC9', textAlign: 'center', color: '#6B7280' }}>
            Nội dung tab {activeTab} sẽ được tự động đồng bộ từ cấu trúc BOM sau khi lưu dữ liệu sản phẩm.
          </div>
        )}

      </div>

      {/* PASTE FROM EXCEL MODAL */}
      {showPasteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '800px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2D1A12', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} color="#10B981" /> Dán dữ liệu từ file Excel
              </h2>
              <button type="button" onClick={() => setShowPasteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.83rem', color: '#4B5563', marginBottom: '12px' }}>
              Sao chép các dòng trong Excel (Cột STT, Tên thành phẩm, Đơn vị, Quy cách (mm), Công đoạn giao, Công đoạn nhận) rồi dán vào ô bên dưới:
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Dán dữ liệu Excel tại đây (Ctrl + V)..."
              style={{ width: '100%', height: '260px', padding: '12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none', backgroundColor: '#F9FAFB' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowPasteModal(false)} style={{ padding: '8px 18px', backgroundColor: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Hủy bỏ</button>
              <button
                type="button"
                onClick={handlePasteExcel}
                style={{ padding: '8px 22px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}
              >
                Xác nhận Nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG MODAL */}
      {showConfigModal && (
        <ConfigInfoModal onClose={() => setShowConfigModal(false)} />
      )}

      {/* ADD COMPONENT MODAL */}
      {showAddComponentModal && (
        <AddComponentModal
          mode="create"
          product={formData}
          bomRows={bomRows}
          onClose={() => setShowAddComponentModal(false)}
          onSuccess={handleAddComponentSuccess}
        />
      )}
    </div>
  );
};

export default ProductCreateView;
