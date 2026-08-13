import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
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
  MoreHorizontal,
  Box,
  Trash2,
  Palette,
  Layers
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import AddComponentModal from './modals/AddComponentModal';
import AddDetailModal from './modals/AddDetailModal';
import AddPaintColorModal from './modals/AddPaintColorModal';
import ConfigInfoModal from './modals/ConfigInfoModal';
import '@styles/components.css';

/**
 * View: Chi tiết sản phẩm - KT03 (/admin/products/:id)
 * Tái hiện chính xác 100% Giao diện Mockup 1:
 * - Khung Thông tin chung: 5 nút thao tác góc phải, khung ảnh chính + 3 ảnh thumbnail phụ xếp dọc bên phải.
 * - Form thông tin chung + Hàng Meta 6 ô nền xám #E5E7EB bên dưới.
 * - Thanh Action Toolbar: Search, Icon Sort A-Z, Icon Filter, 4 nút nâu đậm (Cấu hình thông tin, Nhập dữ liệu, Xuất dữ liệu, + Thêm mới).
 * - Bảng BOM 13 cột chuẩn Mockup với STT phân cấp (1, 1.1, 1.1.1, 1.1.1.1, 1.1.1.1.1, 1.1.1.3, 1.2, 2, 3, 4).
 */
const ProductDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/products/:id');

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bom');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState('Định hình');
  const [showAddDetailModal, setShowAddDetailModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [showAddPaintModal, setShowAddPaintModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
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

  const [visibleColumns, setVisibleColumns] = useState({
    stt: true,
    type: true,
    stageFrom: true,
    stageTo: true,
    compCode: true,
    compName: true,
    quantity: true,
    unit: true,
    material: true,
    spec: true,
    volume: true,
    note: true,
    actions: true
  });

  // Đặt Tiêu đề và Subtitle chuẩn lên Thanh Nav Cố Định
  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Quản lý sản phẩm');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Chi tiết sản phẩm');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'KT03');
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
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, navigate, title, subtitle, screenCode]);

  // Form Thông tin chung
  const [formData, setFormData] = useState({
    sku: '',
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
    bomStatus: 'Đã duyệt',
    totalComponents: '10',
    estimatedCost: '5.200.000 VNĐ',
    color: 'Màu tự nhiên'
  });

  // State chứa danh sách Danh mục động từ Backend API (/categories)
  const [categoriesOptions, setCategoriesOptions] = useState([]);

  // Danh mục dòng hàng mặc định từ BOM làm fallback
  const defaultBomLines = [
    'APT', 'ATL', 'FOL', 'ADV',
    'TPH', 'HOR', 'EYC', 'COV',
    'TIN', 'BEZ', 'MBC'
  ];

  // Lấy danh sách Dòng hàng từ SQL Server (/master-categories/ hoặc /categories)
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
            if (!prev.line || prev.line === 'Nội thất') {
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
    if (matchedLine && (!formData.line || formData.line === 'Nội thất')) {
      setFormData(prev => ({ ...prev, line: matchedLine.name }));
    }
  }, [formData.sku, categoriesOptions]);


  // Hàm xử lý và sắp xếp cây linh kiện BOM 100% đầy đủ từ SQL Server Backend theo đúng phân cấp (1, 1.1, 1.1.1, 1.2, 2...)
  const processBackendBOM = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return [];

    // Map các node theo ID
    const itemMap = new Map();
    items.forEach(item => {
      if (item && item.id != null) {
        itemMap.set(item.id, item);
      }
    });

    // Gom nhóm danh sách con theo parent_id
    const childrenMap = new Map();
    const roots = [];
    const hasParentId = items.some(item => item && item.parent_id != null);

    if (hasParentId) {
      items.forEach(item => {
        if (item.parent_id != null && itemMap.has(item.parent_id)) {
          if (!childrenMap.has(item.parent_id)) {
            childrenMap.set(item.parent_id, []);
          }
          childrenMap.get(item.parent_id).push(item);
        } else {
          roots.push(item);
        }
      });
    } else {
      items.forEach(item => roots.push(item));
    }

    let result = [];
    const seenMap = new Map();

    const addNode = (item, currentStt, parentName = '') => {
      const codeKey = `${item.id || currentStt}-${item.component_sku || item.sku || ''}`;
      if (!seenMap.has(codeKey)) {
        seenMap.set(codeKey, true);
        const spec = item.specification || item.spec || '';
        let len = item.length || 0;
        let wid = item.width || 0;
        let hgt = item.height || 0;
        if (!len && !wid && !hgt && spec) {
          const parts = spec.split(/[*xX]/).map(p => parseFloat(p.trim()) || 0);
          if (parts.length >= 1) len = parts[0];
          if (parts.length >= 2) wid = parts[1];
          if (parts.length >= 3) hgt = parts[2];
        }

        const isChild = currentStt.includes('.');
        const rowType = item.component_type || item.type || (isChild ? (parentName || 'Chi tiết') : 'Sản phẩm');

        result.push({
          id: item.id || `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          parent_id: item.parent_id || null,
          stt: currentStt,
          type: rowType,
          stageFrom: item.input_stage || item.stageFrom || (isChild ? 'Tạo phôi' : 'Định hình'),
          stageTo: item.output_stage || item.stageTo || (isChild ? 'Định hình' : 'Lắp ráp'),
          compCode: item.component_sku || item.sku || item.compCode || `SKU.${currentStt}`,
          compName: item.name || item.compName || 'Cụm chi tiết',
          quantity: item.quantity !== undefined ? item.quantity : 1,
          unit: item.unit || 'Cái',
          material: item.material || 'Gỗ / MDF',
          spec: spec,
          length: len,
          width: wid,
          height: hgt,
          waste_ratio: item.waste_ratio || 0,
          volume: item.volume !== undefined ? String(item.volume) : '1',
          note: item.description || item.note || ''
        });
      }

      // Duyệt qua các con (từ childrenMap hoặc item.children)
      const kids = (hasParentId && item.id != null && childrenMap.has(item.id))
        ? childrenMap.get(item.id)
        : (item.children && Array.isArray(item.children) ? item.children : []);

      if (kids && kids.length > 0) {
        kids.forEach((child, cIdx) => {
          const childStt = `${currentStt}.${cIdx + 1}`;
          addNode(child, childStt, item.name || item.compName || 'Chi tiết');
        });
      }
    };

    roots.forEach((rootItem, rIdx) => {
      const rootStt = rootItem.tree_stt || rootItem.treeStt || rootItem.stt || String(rIdx + 1);
      addNode(rootItem, rootStt, rootItem.name || rootItem.compName || 'Sản phẩm');
    });

    return result;
  };

  // Tải thông tin DỮ LIỆU ĐỘNG từ Backend API (/master-products/:id)
  const fetchProduct = async () => {
    try {
      setLoading(true);
      let res = await api.get(`/master-products/${id}`).catch(() => null);
      if (!res) {
        res = await api.get(`/products/${id}`).catch(() => null);
      }
      const data = (res && res.data && typeof res.data === 'object' && !Array.isArray(res.data) && (res.data.id || res.data.sku || res.data.product_code || res.data.name)) ? res.data : (res || {});

      if (data && (data.id || data.sku || data.product_code || data.name)) {
        setProduct(data);

        const formattedDate = data.adjusted_date
          ? data.adjusted_date
          : (data.created_at ? new Date(data.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'));

        setFormData(prev => ({
          ...prev,
          sku: data.sku || data.product_code || data.code || `ADV${id}`,
          category: data.category_name || data.master_category?.name || 'Tủ quần áo',
          line: data.brand_name || data.group_name || 'Nội thất',
          name: data.name || data.product_name || data.new_name || `Sản phẩm ${id}`,
          length: (data.length !== undefined && data.length !== null) ? String(data.length) : '1200',
          width: (data.width !== undefined && data.width !== null) ? String(data.width) : '450',
          height: (data.height !== undefined && data.height !== null) ? String(data.height) : '750',
          weight: data.weight ? `${data.weight} kg` : '25 kg',
          note: data.specification || data.description || 'Chuẩn',
          updatedAt: formattedDate,
          updatedBy: data.updated_by || 'Admin Hệ Thống',
          bomStatus: data.status || 'Đã duyệt',
          totalComponents: (data.master_bom_details || data.bom_details || data.bom || []).length ? String((data.master_bom_details || data.bom_details || data.bom).length) : '0',
          estimatedCost: data.price ? Number(String(data.price).replace(/\D/g, '')).toLocaleString('vi-VN') : '0',
          color: data.color || 'Màu tự nhiên'
        }));

        const bomList = data.master_bom_details || data.bom_tree || data.bom_details || data.bom || [];
        if (Array.isArray(bomList) && bomList.length > 0) {
          const processed = processBackendBOM(bomList);
          if (processed.length > 0) {
            setBomRows(processed);
          }
        }

        const detailsList = data.product_details || data.details || [];
        if (Array.isArray(detailsList)) {
          setDetailRows(detailsList);
        }

        const paintList = data.paint_color_samples || data.paint_colors || [];
        if (Array.isArray(paintList)) {
          setPaintColorRows(paintList);
        }
      } else {
        setProduct({ id, sku: `ADV${id}`, name: `Sản phẩm ${id}` });
        setFormData(prev => ({
          ...prev,
          sku: `ADV${id}`,
          category: 'Tủ quần áo',
          line: 'Nội thất',
          name: `Sản phẩm ${id}`,
          length: '1200',
          width: '450',
          height: '750',
          weight: '25 kg',
          note: 'Chuẩn',
          color: 'Màu tự nhiên'
        }));
      }
    } catch (err) {
      console.warn('Lỗi lấy chi tiết sản phẩm:', err);
      setProduct({ id, sku: `ADV${id}`, name: `Sản phẩm ${id}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Hàm xóa chi tiết (KT03.1)
  const handleDeleteDetail = async (detailId) => {
    try {
      await api.delete(`/master-products/${id}/product-details/${detailId}`);
      if (toast) toast('success', 'Đã xóa chi tiết thành công!');
      fetchProduct();
    } catch (err) {
      console.error('Lỗi khi xóa chi tiết:', err);
      if (toast) toast('error', 'Không thể xóa chi tiết');
    }
  };

  // Hàm xóa mẫu màu sơn (KT03.3)
  const handleDeletePaintColor = async (sampleId) => {
    try {
      await api.delete(`/master-products/${id}/paint-colors/${sampleId}`);
      if (toast) toast('success', 'Đã xóa mẫu màu sơn thành công!');
      fetchProduct();
    } catch (err) {
      console.error('Lỗi khi xóa mẫu màu sơn:', err);
      if (toast) toast('error', 'Không thể xóa mẫu màu sơn');
    }
  };

  // Dữ liệu bảng BOM 13 Cột phân cấp chuẩn Mockup 1
  const [bomRows, setBomRows] = useState([]);

  // Đồng bộ dòng sản phẩm gốc (STT 1 / Dòng đầu tiên) với thông tin form chung
  useEffect(() => {
    setBomRows(prev => {
      if (prev.length === 0) return prev;
      const root = prev[0];
      if (root.stt !== '1') return prev;
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
      ) {
        return prev;
      }
      const updatedRoot = {
        ...root,
        stt: '1',
        type: 'Sản phẩm',
        stageFrom: 'Đóng gói',
        stageTo: 'Lưu kho',
        compCode,
        compName,
        spec,
        length: parseFloat(len) || 0,
        width: parseFloat(wid) || 0,
        height: parseFloat(hgt) || 0,
        quantity: 1,
        unit: 'Cái',
        material: formData.category || root.material || 'Gỗ / MDF'
      };
      return [updatedRoot, ...prev.slice(1)];
    });
  }, [formData.sku, formData.name, formData.length, formData.width, formData.height, formData.category]);

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
  const mainStages = useMemo(() => {
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
        if (rank >= 6) return; // Không đưa Kho vào nút quy trình ở giữa
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

  const displayItems = useMemo(() => {
    if (!bomRows || bomRows.length === 0) return [];
    const activeNorm = (activeStage || '').trim();
    const activeLower = activeNorm.toLowerCase();

    // Nhận diện Tiền tố Nhà máy trong dữ liệu BOM (ví dụ: NM2, NM3, NM1)
    let factoryPrefix = '';
    (bomRows || []).forEach(r => {
      const str = `${r.stageFrom || ''} ${r.stageTo || ''}`;
      const match = str.match(/NM[1-3]/);
      if (match && !factoryPrefix) {
        factoryPrefix = match[0];
      }
    });

    const getPrefixedStage = (coreName) => {
      if (!factoryPrefix) return coreName;
      const pNum = factoryPrefix.replace('NM', '');
      if (coreName === 'Tạo phôi') return `${factoryPrefix} - Tạo phôi ${pNum}`;
      if (coreName === 'Định hình') return `${factoryPrefix} - Định hình ${pNum}`;
      if (coreName === 'Lắp ráp') return `${factoryPrefix} - Lắp ráp ${pNum}`;
      if (coreName === 'Sơn') return `${factoryPrefix} - Sơn ${pNum}`;
      if (coreName === 'Đóng gói') return `${factoryPrefix} - Đóng gói ${pNum}`;
      return coreName;
    };

    const matchStage = (stage, active) => {
      if (!stage || !active) return false;
      const s = String(stage).trim().toLowerCase();
      const a = String(active).trim().toLowerCase();
      if (s === a) return true;

      const isPhoi = a.includes('phôi') || a.includes('cắt');
      const isDinhHinh = a.includes('định hình') || a.includes('chà') || a.includes('nhám');
      const isLapRap = a.includes('lắp ráp') || a.includes('lắp');
      const isSon = a.includes('sơn');
      const isDongGoi = a.includes('đóng gói') || a.includes('gói');

      if (isPhoi && (s.includes('phôi') || s.includes('cắt'))) return true;
      if (isDinhHinh && (s.includes('định hình') || s.includes('chà') || s.includes('nhám'))) return true;
      if (isLapRap && (s.includes('lắp ráp') || s.includes('lắp'))) return true;
      if (isSon && s.includes('sơn')) return true;
      if (isDongGoi && (s.includes('đóng gói') || s.includes('gói'))) return true;

      return false;
    };

    const enrich = (item) => {
      const level = item.stt ? item.stt.split('.').length - 1 : 0;
      const compLower = (item.compName || '').toLowerCase();
      const codeLower = (item.compCode || '').toLowerCase();
      const typeLower = (item.type || '').toLowerCase();
      const unitLower = (item.unit || '').toLowerCase();

      const isRawMaterial = unitLower === 'm3' || unitLower === 'm2' || compLower.includes('gỗ') || compLower.includes('ván') || compLower.includes('phôi') || codeLower.startsWith('blb') || codeLower.startsWith('csu');
      const isPackaging = typeLower.includes('đóng gói') || typeLower.includes('phụ kiện') || compLower.includes('carton') || compLower.includes('thùng') || compLower.includes('nẹp') || compLower.includes('hướng dẫn');

      return { ...item, level, isRawMaterial, isPackaging };
    };

    const enrichedRows = bomRows.map(enrich);

    // BƯỚC 1: Lọc duy nhất những dòng có CÔNG ĐOẠN NHẬN (stageTo) trùng với activeStage đang chọn
    const matchingRowsByStageTo = enrichedRows.filter(i => matchStage(i.stageTo, activeNorm));

    // Hàm format thông tin Công đoạn giao (stageFrom) và Công đoạn nhận (stageTo)
    const formatItem = (item) => {
      let from = item.stageFrom ? normalizeStageName(item.stageFrom, factoryPrefix) : '';
      let to = item.stageTo ? normalizeStageName(item.stageTo, factoryPrefix) : activeNorm;

      // ĐẶC BIỆT: Mục Tạo phôi -> Công đoạn giao LÀ KHO
      if (activeLower.includes('phôi') || to.toLowerCase().includes('phôi')) {
        from = 'Kho';
        to = activeNorm || getPrefixedStage('Tạo phôi');
      } else {
        // Nếu stageFrom chưa có hoặc trùng với stageTo, gán mặc định từ công đoạn trước đó
        if (!from || from === to) {
          if (activeLower.includes('định hình')) from = getPrefixedStage('Tạo phôi');
          else if (activeLower.includes('lắp ráp')) from = getPrefixedStage('Định hình');
          else if (activeLower.includes('sơn')) from = getPrefixedStage('Lắp ráp');
          else if (activeLower.includes('đóng gói')) from = getPrefixedStage('Sơn');
        }
      }

      return { ...item, stageFrom: from, stageTo: to };
    };

    if (matchingRowsByStageTo.length > 0) {
      return matchingRowsByStageTo.map(formatItem);
    }

    // BƯỚC 2: Fallback nếu trong BOM chưa khai báo stageTo cụ thể, phân loại theo tính chất linh kiện:
    if (activeLower.includes('phôi') || activeLower.includes('cắt')) {
      const phoiOnly = enrichedRows.filter(i => i.isRawMaterial);
      const rows = phoiOnly.length > 0 ? phoiOnly : enrichedRows.filter(i => i.level >= 2);
      return rows.map(formatItem);
    }

    if (activeLower.includes('định hình') || activeLower.includes('chà') || activeLower.includes('nhám')) {
      const dihOnly = enrichedRows.filter(i => !i.isRawMaterial && !i.isPackaging && i.level >= 2);
      const rows = dihOnly.length > 0 ? dihOnly : enrichedRows.filter(i => !i.isRawMaterial && !i.isPackaging);
      return rows.map(formatItem);
    }

    if (activeLower.includes('lắp ráp') || activeLower.includes('lắp')) {
      const lapOnly = enrichedRows.filter(i => !i.isRawMaterial && !i.isPackaging && i.level === 1);
      const rows = lapOnly.length > 0 ? lapOnly : enrichedRows.filter(i => !i.isRawMaterial && !i.isPackaging);
      return rows.map(formatItem);
    }

    if (activeLower.includes('sơn')) {
      const sonOnly = enrichedRows.filter(i => !i.isRawMaterial && !i.isPackaging && i.level <= 1);
      return sonOnly.map(formatRow);
    }

    if (activeLower.includes('đóng gói') || activeLower.includes('gói')) {
      const pkgOnly = enrichedRows.filter(i => i.isPackaging || i.level === 0);
      return pkgOnly.map(formatRow);
    }

    if (activeLower.includes('kho') || activeLower.includes('lưu kho')) {
      const prodCode = product?.product_code || product?.code || 'ADV011';
      const prodName = product?.product_name || product?.name || 'Sản phẩm hoàn chỉnh';
      return [{
        stt: '1',
        type: 'Thành phẩm',
        compCode: prodCode,
        compName: `${prodName} (Sản phẩm hoàn chỉnh)`,
        quantity: '1',
        unit: 'Bộ',
        material: product?.material || 'Gỗ / MDF',
        spec: product?.specifications || 'Hoàn chỉnh',
        volume: '1',
        note: 'Sản phẩm đóng gói hoàn chỉnh sẵn sàng xuất hàng',
        stageFrom: 'Kho thành phẩm',
        stageTo: 'Xuất hàng'
      }];
    }

    return enrichedRows.map(formatRow);
  }, [bomRows, activeStage, product]);

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

  const updateBomRow = (id, fieldOrUpdates, value) => {
    setBomRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === 0) return prev; // Không sửa dòng đầu tiên (Sản phẩm chính)
      return prev.map(row => {
        if (row.id !== id) return row;
        if (typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null) {
          return { ...row, ...fieldOrUpdates };
        }
        return { ...row, [fieldOrUpdates]: value };
      });
    });
  };

  const handleAddMainBomRow = () => {
    const rootNums = bomRows
      .map(r => r.stt ? parseInt(r.stt.split('.')[0]) : 0)
      .filter(n => !isNaN(n) && n > 0);
    const nextStt = String(rootNums.length > 0 ? Math.max(...rootNums) + 1 : 1);
    const newRow = {
      id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      parent_id: null,
      stt: nextStt,
      type: 'Sản phẩm',
      stageFrom: 'Định hình',
      stageTo: 'Lắp ráp',
      compCode: `${formData.sku || 'SKU'}.${nextStt}`,
      compName: '',
      quantity: 1,
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
      id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      parent_id: parentRow.id || null,
      stt: newStt,
      type: parentRow.compName || 'Chi tiết',
      stageFrom: 'Tạo phôi',
      stageTo: 'Định hình',
      compCode: `${formData.sku || 'SKU'}.${newStt}`,
      compName: '',
      quantity: 1,
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
    if (toast) toast('success', `Đã thêm chi tiết con ${newStt}!`);
  };

  const handleDeleteBomRow = (rowId) => {
    setBomRows(prev => {
      const targetIndex = prev.findIndex(r => r.id === rowId);
      if (targetIndex === 0) {
        if (toast) toast('warning', 'Không thể xóa dòng sản phẩm chính!');
        return prev;
      }
      if (prev.length <= 1) {
        if (toast) toast('warning', 'Phải giữ ít nhất 1 dòng trong BOM!');
        return prev;
      }
      const target = prev.find(r => r.id === rowId);
      if (!target) return prev;
      const targetStt = target.stt;
      const remaining = prev.filter(r => r.id !== rowId && !r.stt.startsWith(`${targetStt}.`));
      return remaining;
    });
    if (toast) toast('success', 'Đã xóa dòng chi tiết khỏi BOM!');
  };

  const handleSaveInfo = async () => {
    try {
      const parsedPrice = parseFloat(String(formData.estimatedCost || '0').replace(/\./g, '').replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
      const selectedCat = categoriesOptions.find(c => c.name === formData.category || String(c.id) === String(formData.category));
      const categoryId = selectedCat?.id || product?.category_id || undefined;

      await api.put(`/master-products/${id}`, {
        sku: formData.sku,
        name: formData.name,
        category_id: categoryId,
        brand_name: formData.line,
        color: formData.color,
        price: parsedPrice,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
        weight: parseFloat(String(formData.weight || '0').replace(/[^\d.]/g, '')) || 0,
        specification: formData.note,
        description: formData.note,
        status: formData.bomStatus,
        master_bom_details: bomRows
      });

      if (toast) toast('success', 'Đã lưu thông tin chi tiết sản phẩm và BOM thành công!');
      fetchProduct();
    } catch (err) {
      console.error('Lỗi lưu chi tiết sản phẩm:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi lưu thông tin sản phẩm.');
    }
  };

  const filteredBomRows = useMemo(() => {
    if (!bomRows || bomRows.length === 0) return [];
    if (!searchTerm || searchTerm.trim() === '') return bomRows;

    const lowerSearch = searchTerm.toLowerCase();
    return bomRows.filter(row => {
      const compCode = (row.compCode || '').toLowerCase();
      const compName = (row.compName || '').toLowerCase();
      const type = (row.type || '').toLowerCase();
      const material = (row.material || '').toLowerCase();

      return compCode.includes(lowerSearch) ||
        compName.includes(lowerSearch) ||
        type.includes(lowerSearch) ||
        material.includes(lowerSearch);
    });
  }, [bomRows, searchTerm]);

  if (loading) {
    return (
      <div className="mgmt-container" style={{ backgroundColor: '#FAF6F1', minHeight: '100vh', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 15px' }}>
            <div className="spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #7B5233',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#7B5233', fontWeight: '600' }}>Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container detail-view-container" style={{ backgroundColor: '#FAF6F1', minHeight: '100%', padding: '12px 16px 60px 16px' }}>
      <div className="mgmt-main" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* KHUNG 1: THÔNG TIN CHUNG (CHUẨN MOCKUP 1 - TỐI ƯU COMPACT VỀ CHIỀU CAO) */}
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
              Thông tin chung
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => toast('info', 'Lấy thông tin từ sản phẩm khác')}
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
                onClick={() => toast('info', 'Nhập danh sách linh kiện')}
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
                <Upload size={15} /> Nhập danh sách
              </button>

              <button
                type="button"
                onClick={() => toast('info', 'Xuất lệnh sản xuất')}
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
                <Download size={15} /> Xuất lệnh
              </button>

              <button
                type="button"
                onClick={() => toast('info', 'Chuyển thông tin kỹ thuật')}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#65A30D',
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
                <Send size={15} /> Chuyển thông tin
              </button>

              <button
                type="button"
                onClick={handleSaveInfo}
                style={{
                  padding: '7px 18px',
                  backgroundColor: '#5D3B32',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(93, 59, 50, 0.2)'
                }}
              >
                <Save size={15} /> Lưu thông tin
              </button>
            </div>
          </div>

          {/* Hàng 1 + Hàng 2: Bố cục Khung Ảnh & Form 7 Ô Nhập */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', marginBottom: '10px' }}>

            {/* Khung Ảnh Sản Phẩm (Ảnh chính + 3 Thumbnail Phụ xếp dọc bên phải) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {/* Ô ảnh chính vuông lớn */}
              <div style={{
                width: '240px',
                height: '165px',
                backgroundColor: '#F8FAFC',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#94A3B8'
              }}>
                <Box size={52} style={{ strokeWidth: 1.5 }} />
                <span style={{ fontSize: '0.72rem', fontWeight: '600', marginTop: '4px' }}>Hình sản phẩm</span>
              </div>

              {/* 3 Ô ảnh thumbnail nhỏ xếp dọc bên phải */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'between' }}>
                {[1, 2, 3].map((thumbIdx) => (
                  <div
                    key={thumbIdx}
                    style={{
                      width: '64px',
                      height: '51px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#CBD5E1'
                    }}
                  >
                    <Box size={22} />
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields: Hàng 1 & Hàng 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Hàng 1: Mã SP | Danh mục | Dòng hàng | Tên sản phẩm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr 3fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Mã sản phẩm</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '800', color: '#1F2937', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
                  >
                    {(categoriesOptions.length > 0 ? categoriesOptions : defaultBomLines.map(name => ({ name }))).map(cat => (
                      <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Tên sản phẩm</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      type="text"
                      placeholder="Dài"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                    <input
                      type="text"
                      placeholder="Rộng"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                    <input
                      type="text"
                      placeholder="Cao"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      style={{ padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: '7px', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center', backgroundColor: '#FFF' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Khối lượng</label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#1F2937', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>Ghi chú</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '600', color: '#334155', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Hàng 3: Hàng Thông Tin Meta 6 Ô Nền Xám (Ngày cập nhật, Người cập nhật, Trạng thái BOM, Tổng số LK, Ước tính chi phí, Màu sắc) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Ngày cập nhật</label>
              <input
                type="text"
                readOnly
                value={formData.updatedAt}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '700', color: '#334155', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Người cập nhật</label>
              <input
                type="text"
                readOnly
                value={formData.updatedBy}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#E5E7EB', fontWeight: '700', color: '#334155', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Trạng thái bom</label>
              <select
                value={formData.bomStatus}
                onChange={(e) => setFormData({ ...formData, bomStatus: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #D1D5DB', borderRadius: '7px', backgroundColor: '#FFF', fontWeight: '700', color: '#166534', outline: 'none' }}
              >
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đang thiết kế">Đang thiết kế</option>
                <option value="Hoạt động">Hoạt động</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '4px' }}>Tổng số linh kiện</label>
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
                    setFormData({ ...formData, estimatedCost: formatted });
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
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
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

        {/* KHUNG 2: THANH 4 TAB NỔI BẬT (BOM sản phẩm | Quy trình thực hiện | Bản vẽ kỹ thuật | Định mức vật tư) */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid #EADCC9', paddingLeft: '4px', marginBottom: '2px' }}>
          <button
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
            Bom sản
          </button>

          <button
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

        {/* NỘI DUNG CHI TIẾT CỦA TAB BAN ĐẦU */}
        {activeTab === 'bom' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* THANH ACTION TOOLBAR PHÍA TRÊN BẢNG BOM - CHIA 2 BÊN TUYỆT ĐỐI */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
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
                  onClick={() => toast('info', 'Sắp xếp danh sách (A-Z)')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#4B5563', display: 'flex', alignItems: 'center' }}
                  title="Sắp xếp danh sách (A-Z)"
                >
                  <ArrowUpDown size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => toast('info', 'Bộ lọc nâng cao')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#4B5563', display: 'flex', alignItems: 'center' }}
                  title="Bộ lọc"
                >
                  <Filter size={18} />
                </button>
              </div>

              {/* BÊN PHẢI: 4 Nút Nâu Đậm (#5D3B32) ĐẨY VỀ GÓC PHẢI TUYỆT ĐỐI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>

                {/* NÚT CẤU HÌNH THÔNG TIN - DROPDOWN CHỨA THÊM CHI TIẾT & THÊM MẪU MÀU SƠN */}
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
                  onClick={() => toast('info', 'Nhập dữ liệu')}
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
                  <Upload size={15} /> Nhập dữ liệu
                </button>

                <button
                  type="button"
                  onClick={() => toast('info', 'Xuất dữ liệu')}
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
                  <Download size={15} /> Xuất dữ liệu
                </button>

                {/* NÚT THÊM CHI TIẾT TRỰC TIẾP VÀO BẢNG BOM */}
                <button
                  type="button"
                  onClick={handleAddMainBomRow}
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
                  <Plus size={16} /> Thêm chi tiết
                </button>
              </div>
            </div>

            {/* BẢNG BOM 13 CỘT CHUẨN MOCKUP 1 (BO GÓC BO TRÒN TỰ NHIÊN & KHÔNG BỊ TRÀN) */}
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
                minHeight: '280px',
                maxHeight: 'calc(100vh - 520px)',
                borderRadius: '10px',
                paddingBottom: '24px'
              }}>
                <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                      {visibleColumns.stt && <th style={{ padding: '10px', textAlign: 'center', width: '55px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>STT</th>}
                      {visibleColumns.type && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Loại</th>}
                      {visibleColumns.stageFrom && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Công đoạn giao</th>}
                      {visibleColumns.stageTo && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Công đoạn nhận</th>}
                      {visibleColumns.compCode && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Mã thành phẩm</th>}
                      {visibleColumns.compName && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Tên thành phẩm</th>}
                      {visibleColumns.quantity && <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Số lượng</th>}
                      {visibleColumns.unit && <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Đơn vị</th>}
                      {visibleColumns.material && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Vật liệu</th>}
                      {visibleColumns.spec && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Quy cách (mm)</th>}
                      {visibleColumns.volume && <th style={{ padding: '10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Khối lượng (m3)</th>}
                      {visibleColumns.note && <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Ghi chú</th>}
                      {visibleColumns.actions && <th style={{ padding: '10px', textAlign: 'center', fontWeight: '700', width: '70px', backgroundColor: '#6D4C3D' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBomRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                          Không tìm thấy linh kiện BOM phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredBomRows.map((row, index) => {
                        const isRootRow = (index === 0);
                        const levelDepth = row.stt ? row.stt.split('.').length - 1 : 0;
                        const effectiveSuggestions = (row.type && suggestionsByParent[row.type])
                          ? suggestionsByParent[row.type]
                          : detailSuggestions;

                        return (
                          <tr
                            key={row.id || index}
                            style={{
                              borderBottom: '1px solid #EADCC9',
                              backgroundColor: isRootRow ? '#FDFBF7' : (index % 2 === 1 ? '#FAF6F0' : '#FFFFFF')
                            }}
                          >
                            {/* STT */}
                            {visibleColumns.stt && (
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: '#5D3B32' }}>
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
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'center',
                                    fontWeight: '800',
                                    color: '#5D3B32',
                                    cursor: isRootRow ? 'default' : 'text'
                                  }}
                                />
                              </td>
                            )}

                            {/* Loại */}
                            {visibleColumns.type && (
                              <td style={{ padding: '6px 8px' }}>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    id={`loai-input-${row.id}`}
                                    type="text"
                                    value={row.type || ''}
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
                            )}

                            {/* CĐ Giao */}
                            {visibleColumns.stageFrom && (
                              <td style={{ padding: '6px 8px' }}>
                                <select
                                  value={row.stageFrom || 'Định hình'}
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
                            )}

                            {/* CĐ Nhận */}
                            {visibleColumns.stageTo && (
                              <td style={{ padding: '6px 8px' }}>
                                <select
                                  value={row.stageTo || 'Lắp ráp'}
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
                            )}

                            {/* Mã TP */}
                            {visibleColumns.compCode && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Tên TP */}
                            {visibleColumns.compName && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Số lượng */}
                            {visibleColumns.quantity && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Đơn vị */}
                            {visibleColumns.unit && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Vật liệu */}
                            {visibleColumns.material && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Quy cách (mm) */}
                            {visibleColumns.spec && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Khối lượng (m3) */}
                            {visibleColumns.volume && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Ghi chú */}
                            {visibleColumns.note && (
                              <td style={{ padding: '6px 8px' }}>
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
                            )}

                            {/* Thao tác */}
                            {visibleColumns.actions && (
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                      onClick={() => handleDeleteBomRow(row.id)}
                                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', padding: '3px' }}
                                      title="Xóa dòng"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG PHỤ TRỢ 1: BẢNG DANH SÁCH CHI TIẾT (KT03.1) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.05)',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '12px 18px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1.5px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#6D4C3D" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#2D1A12' }}>
                    KT03.1: Danh sách Chi tiết
                  </h4>
                  <span style={{
                    backgroundColor: '#6D4C3D',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {detailRows.length}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '50px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên chi tiết</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '80px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '70px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Thành phẩm</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '70px', fontWeight: '700' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '1.8rem', color: '#94A3B8', fontWeight: '600' }}>
                          Chưa có chi tiết nào được thêm. Nhấn "Cấu hình thông tin" → "KT03.1: Thêm chi tiết" để tạo mới.
                        </td>
                      </tr>
                    ) : (
                      detailRows.map((row, idx) => (
                        <tr key={row.id || idx} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#2D1A12' }}>{row.name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{row.quantity}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{row.unit}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{row.input_stage || '---'}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{row.output_stage || '---'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{row.parent_name || '---'}</td>
                          <td style={{ padding: '8px 10px', color: '#334155' }}>{row.material || '---'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteDetail(row.id)}
                              style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              title="Xóa chi tiết"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BẢNG PHỤ TRỢ 2: BẢNG DANH SÁCH MẪU MÀU SƠN (KT03.3) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.05)',
              marginBottom: '24px'
            }}>
              <div style={{
                padding: '12px 18px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1.5px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Palette size={18} color="#6D4C3D" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#2D1A12' }}>
                    KT03.3: Danh sách Mẫu Màu Sơn
                  </h4>
                  <span style={{
                    backgroundColor: '#6D4C3D',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {paintColorRows.length}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '50px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '65px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ảnh mẫu</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã màu sơn</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên màu sơn</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Nhà cung cấp</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày hết hạn</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ghi chú</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày tạo</th>
                      <th style={{ padding: '9px 10px', textAlign: 'center', width: '70px', fontWeight: '700' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paintColorRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '1.8rem', color: '#94A3B8', fontWeight: '600' }}>
                          Chưa có mẫu màu sơn nào được thêm. Nhấn "Cấu hình thông tin" → "KT03.3: Thêm mẫu màu sơn" để tạo mới.
                        </td>
                      </tr>
                    ) : (
                      paintColorRows.map((row, idx) => (
                        <tr key={row.id || idx} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            {row.image_url ? (
                              <img src={row.image_url} alt={row.color_name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #D1D5DB' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#E2E8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Palette size={18} color="#94A3B8" />
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{row.color_code}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#334155' }}>{row.color_name}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{row.supplier || '---'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                            {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('vi-VN') : '---'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.note || '---'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94A3B8' }}>
                            {row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '---'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeletePaintColor(row.id)}
                              style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              title="Xóa mẫu màu sơn"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : activeTab === 'process' ? (
          /* TAB 2: QUY TRÌNH THỰC HIỆN - SƠ ĐỒ CHUẨN MOCKUP */
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
                {mainStages.map((stg, idx) => {
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
                      {idx < mainStages.length - 1 && (
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

            {/* Bảng linh kiện theo công đoạn được chọn */}
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
                <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
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
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Quy cách (mm)</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Khối lượng (m3)</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Ghi chú</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '700', backgroundColor: '#6D4C3D' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.length === 0 ? (
                      <tr>
                        <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', fontWeight: '600' }}>
                          Không có linh kiện nào trong công đoạn {activeStage}
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((r, idx) => {
                        const defaultInputStage =
                          activeStage === 'Tạo phôi' ? 'NM3 - Tạo phôi 3' :
                            activeStage === 'Định hình' ? 'NM2 - Định hình mặt tiền 2' :
                              activeStage === 'Lắp ráp' ? 'NM2 - Lắp ráp mặt tiền 2' :
                                activeStage === 'Sơn' ? 'NM2 - Sơn treo 2' :
                                  activeStage === 'Đóng gói' ? 'NM2 - Đóng gói 2' : 'Kho thành phẩm';

                        const defaultOutputStage =
                          activeStage === 'Tạo phôi' ? 'NM2 - Định hình mặt tiền 2' :
                            activeStage === 'Định hình' ? 'NM2 - Lắp ráp mặt tiền 2' :
                              activeStage === 'Lắp ráp' ? 'NM2 - Sơn treo 2' :
                                activeStage === 'Sơn' ? 'NM2 - Đóng gói 2' :
                                  activeStage === 'Đóng gói' ? 'Kho thành phẩm' : 'Xuất hàng';

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #EADCC9',
                              backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF'
                            }}
                          >
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>{r.stt}</td>
                            <td style={{ padding: '9px 10px', fontWeight: '600', color: '#334155' }}>{r.type || '---'}</td>
                            <td style={{ padding: '9px 10px', color: '#475569' }}>{r.stageFrom || defaultInputStage}</td>
                            <td style={{ padding: '9px 10px', color: '#475569' }}>{r.stageTo || defaultOutputStage}</td>
                            <td style={{ padding: '9px 10px', fontWeight: '800', color: '#2D1A12' }}>{r.compCode || '---'}</td>
                            <td style={{ padding: '9px 10px', fontWeight: '600', color: '#334155' }}>{r.compName || '---'}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{r.quantity || '0'}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center', color: '#334155' }}>{r.unit || '---'}</td>
                            <td style={{ padding: '9px 10px', color: '#334155' }}>{r.material || '---'}</td>
                            <td style={{ padding: '9px 10px', color: '#475569' }}>{r.spec || '---'}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: '600' }}>{r.volume || '---'}</td>
                            <td style={{ padding: '9px 10px', color: '#94A3B8' }}>{r.note || '---'}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toast('info', `Thao tác linh kiện ${r.compCode}`)}
                                style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                              >
                                <MoreHorizontal size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3 & TAB 4: BẢN VẼ KỸ THUẬT & ĐỊNH MỨC VẬT TƯ TẠM THỜI TRỐNG */
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            fontSize: '0.88rem',
            fontWeight: '600',
            boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
          }}>
            Nội dung tạm thời trống
          </div>
        )}

      </div>

      {showAddDetailModal && (
        <AddDetailModal
          productId={id}
          product={product}
          bomRows={bomRows}
          detailRows={detailRows}
          onClose={() => setShowAddDetailModal(false)}
          onSuccess={fetchProduct}
        />
      )}

      {showAddComponentModal && (
        <AddComponentModal
          productId={id}
          product={product}
          bomRows={bomRows}
          parentId={selectedParentId}
          onClose={() => setShowAddComponentModal(false)}
          onSuccess={fetchProduct}
        />
      )}

      {showAddPaintModal && (
        <AddPaintColorModal
          productId={id}
          bomRows={bomRows}
          detailRows={detailRows}
          onClose={() => setShowAddPaintModal(false)}
          onSuccess={fetchProduct}
        />
      )}

      {showConfigModal && (
        <ConfigInfoModal
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          onClose={() => setShowConfigModal(false)}
          toast={toast}
        />
      )}
    </div>
  );
};

export default ProductDetailView;
