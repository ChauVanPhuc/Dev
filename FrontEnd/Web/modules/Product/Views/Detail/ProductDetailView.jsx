import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams, useLocation } from 'react-router-dom';

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
  Layers,
  Edit3,
  X,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api, { getBaseURL, API_URL } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import AddComponentModal from './modals/AddComponentModal';
import AddDetailModal from './modals/AddDetailModal';
import AddPaintColorModal from './modals/AddPaintColorModal';
import AddMaterialModal from './modals/AddMaterialModal';
import ConfigInfoModal from './modals/ConfigInfoModal';
import CopyProductModal from './modals/CopyProductModal';
import SelectSheetsModal from '../List/modals/SelectSheetsModal';
import '@styles/components.css';

// Global memory cache for categories
let globalCachedCategories = null;

/**
 * View: Chi tiết sản phẩm - KT03 (/admin/products/:id)
 */
const ProductDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialProduct = location.state?.product;
  const { toast } = useToast();

  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, startGlobalUpload } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/products/:id');

  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [isFetchingBom, setIsFetchingBom] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'bom');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState('Định hình');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showAddDetailModal, setShowAddDetailModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [showAddPaintModal, setShowAddPaintModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [paintColorRows, setPaintColorRows] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialGroupFilter, setMaterialGroupFilter] = useState('ALL');
  const [defaultMaterialGroup, setDefaultMaterialGroup] = useState('VẬT TƯ HÀNG TRẮNG');
  const [sheetModal, setSheetModal] = useState({
    visible: false,
    file: null,
    sheets: []
  });
  const excelInputRef = useRef(null);


  // Image Upload Preview State
  const [mainImage, setMainImage] = useState(initialProduct?.image_url || null);
  const [subImages, setSubImages] = useState([null, null, null]);
  const fileInputRef = useRef(null);

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

  // Load danh sách tên thành phẩm từ master (chạy trễ ở background để không cản trở render trang)
  useEffect(() => {
    const timer = setTimeout(() => {
      api.get('/master-products/detail-suggestions')
        .then(res => {
          if (res) {
            setDetailSuggestions(res.detail_names || []);
            setDetailMetaMap(res.detail_meta_map || {});
            const detailSet = new Set(res.detail_names || []);
            setLoaiOptions((res.parent_names || []).filter(n => detailSet.has(n)));
          }
        })
        .catch(err => console.warn('Lỗi lấy gợi ý tên thành phẩm:', err));
    }, 400);
    return () => clearTimeout(timer);
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
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, title, subtitle, screenCode]);

  // Trạng thái Chế độ Xem (View) vs Chỉnh sửa (Edit)
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [originalData, setOriginalData] = useState(null);

  // Form Thông tin chung
  const [formData, setFormData] = useState(() => {
    if (initialProduct) {
      const formattedDate = initialProduct.adjusted_date
        ? initialProduct.adjusted_date
        : (initialProduct.created_at ? new Date(initialProduct.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'));
      return {
        sku: initialProduct.sku || initialProduct.product_code || initialProduct.code || `ADV${id}`,
        category: initialProduct.category_name || initialProduct.master_category?.name || 'Tủ quần áo',
        line: initialProduct.brand_name || initialProduct.group_name || (initialProduct.sku ? initialProduct.sku.slice(0, 3) : 'ADV'),
        name: initialProduct.name || initialProduct.product_name || initialProduct.new_name || `Sản phẩm ${id}`,
        length: (initialProduct.length !== undefined && initialProduct.length !== null) ? String(initialProduct.length) : '1200',
        width: (initialProduct.width !== undefined && initialProduct.width !== null) ? String(initialProduct.width) : '450',
        height: (initialProduct.height !== undefined && initialProduct.height !== null) ? String(initialProduct.height) : '750',
        weight: initialProduct.weight ? `${initialProduct.weight} kg` : '25 kg',
        note: initialProduct.specification || initialProduct.description || 'Chuẩn',
        updatedAt: formattedDate,
        updatedBy: initialProduct.updated_by || 'Admin Hệ Thống',
        bomStatus: initialProduct.status || 'Đã duyệt',
        totalComponents: (initialProduct.master_bom_details || initialProduct.bom_details || []).length ? String((initialProduct.master_bom_details || initialProduct.bom_details).length) : '0',
        estimatedCost: initialProduct.price ? Number(String(initialProduct.price).replace(/\D/g, '')).toLocaleString('vi-VN') : '0',
        color: initialProduct.color || 'Màu tự nhiên'
      };
    }
    return {
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
    };
  });

  // State chứa danh sách Danh mục động từ Backend API (/categories)
  const [categoriesOptions, setCategoriesOptions] = useState(globalCachedCategories || []);

  // Danh mục dòng hàng mặc định từ BOM làm fallback
  const defaultBomLines = [
    'APT', 'ATL', 'FOL', 'ADV',
    'TPH', 'HOR', 'EYC', 'COV',
    'TIN', 'BEZ', 'MBC'
  ];

  // Lấy danh sách Dòng hàng từ SQL Server (/master-categories/ hoặc /categories)
  useEffect(() => {
    if (globalCachedCategories && globalCachedCategories.length > 0) {
      setCategoriesOptions(globalCachedCategories);
      return;
    }
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
          globalCachedCategories = list;
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

        // Gán chuẩn xác:
        // - output_stage (Công đoạn ra trong Excel) -> stageFrom (Công đoạn giao)
        // - input_stage (Cộng đoạn vào trong Excel) -> stageTo (Công đoạn nhận)
        let fromStage = item.output_stage || item.stageFrom;
        let toStage = item.input_stage || item.stageTo;

        if (!fromStage && toStage) {
          const toLower = toStage.toLowerCase();
          if (toLower.includes('đóng gói')) fromStage = 'Sơn';
          else if (toLower.includes('sơn')) fromStage = 'Lắp ráp';
          else if (toLower.includes('lắp ráp')) fromStage = 'Định hình';
          else if (toLower.includes('định hình')) fromStage = isChild ? 'Tạo phôi' : 'Kho';
          else if (toLower.includes('phôi')) fromStage = 'Kho';
          else fromStage = 'Tạo phôi';
        }

        if (!toStage && fromStage) {
          const fromLower = fromStage.toLowerCase();
          if (fromLower.includes('phôi')) toStage = 'Định hình';
          else if (fromLower.includes('định hình')) toStage = 'Lắp ráp';
          else if (fromLower.includes('lắp ráp')) toStage = 'Sơn';
          else if (fromLower.includes('sơn')) toStage = 'Đóng gói';
          else if (fromLower.includes('đóng gói')) toStage = 'Kho';
          else toStage = 'Lắp ráp';
        }

        if (!fromStage) fromStage = isChild ? 'Tạo phôi' : 'Định hình';
        if (!toStage) toStage = isChild ? 'Định hình' : 'Lắp ráp';

        if (fromStage === toStage) {
          const stgLower = fromStage.toLowerCase();
          if (stgLower.includes('định hình')) fromStage = 'Tạo phôi';
          else if (stgLower.includes('lắp ráp')) fromStage = 'Định hình';
          else if (stgLower.includes('sơn')) fromStage = 'Lắp ráp';
          else if (stgLower.includes('đóng gói')) fromStage = 'Sơn';
          else fromStage = 'Kho';
        }

        result.push({
          id: item.id || `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          parent_id: item.parent_id || null,
          stt: currentStt,
          type: rowType,
          stageFrom: fromStage,
          stageTo: toStage,
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
      setIsFetchingBom(true);
      if (!initialProduct && !product) {
        setLoading(true);
      }
      let res = await api.get(`/master-products/${id}`).catch(() => null);
      if (!res) {
        res = await api.get(`/products/${id}`).catch(() => null);
      }
      const data = (res && res.data && typeof res.data === 'object' && !Array.isArray(res.data) && (res.data.id || res.data.sku || res.data.product_code || res.data.name)) ? res.data : (res || {});

      if (data && (data.id || data.sku || data.product_code || data.name)) {
        setProduct(data);
        setMainImage(data.image_url || null);

        const formattedDate = data.adjusted_date
          ? data.adjusted_date
          : (data.created_at ? new Date(data.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'));

        const formSnapshot = {
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
        };
        setFormData(formSnapshot);

        let finalProcessedBom = [];
        const bomList = data.master_bom_details || data.bom_tree || data.bom_details || data.bom || [];
        if (Array.isArray(bomList) && bomList.length > 0) {
          const processed = processBackendBOM(bomList);
          if (processed.length > 0) {
            finalProcessedBom = processed;
            setBomRows(processed);
          }
        }

        setOriginalData({
          formData: formSnapshot,
          bomRows: finalProcessedBom,
          mainImage: data.image_url || null
        });

        const detailsList = data.product_details || data.details || [];
        if (Array.isArray(detailsList)) {
          setDetailRows(detailsList);
        }

        const paintList = data.paint_color_samples || data.paint_colors || [];
        if (Array.isArray(paintList)) {
          setPaintColorRows(paintList);
        }

        const materialsList = data.materials || [];
        if (Array.isArray(materialsList) && materialsList.length > 0) {
          setMaterialRows(materialsList);
        } else {
          // Tự động kéo dữ liệu định mức vật tư ở chế độ nền (non-blocking)
          const pSku = data.sku || data.product_code || '';
          const pName = data.name || '';
          api.get(`/master-products/materials-by-product?product_id=${data.id}&sku=${encodeURIComponent(pSku)}&name=${encodeURIComponent(pName)}`)
            .then(matRes => {
              if (Array.isArray(matRes) && matRes.length > 0) {
                setMaterialRows(matRes);
              } else {
                setMaterialRows([]);
              }
            })
            .catch(() => {
              setMaterialRows([]);
            });
        }
      } else {
        const defaultForm = {
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
        };
        setProduct({ id, sku: `ADV${id}`, name: `Sản phẩm ${id}` });
        setFormData(prev => ({ ...prev, ...defaultForm }));
        setOriginalData({
          formData: defaultForm,
          bomRows: [],
          mainImage: null
        });
      }
    } catch (err) {
      console.warn('Lỗi lấy chi tiết sản phẩm:', err);
      setProduct({ id, sku: `ADV${id}`, name: `Sản phẩm ${id}` });
    } finally {
      setLoading(false);
      setIsFetchingBom(false);
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

  // Hàm xóa dòng vật tư BOM
  const handleDeleteMaterial = async (materialId, rowIdx = null) => {
    try {
      if (materialId) {
        await api.delete(`/master-products/materials-item/${materialId}`).catch(err => {
          console.warn('Lưu ý khi gọi API xóa vật tư:', err);
        });
      }
      setMaterialRows(prev => prev.filter((m, i) => materialId ? m.id !== materialId : i !== rowIdx));
      if (toast) toast('success', 'Đã xóa dòng vật tư thành công!');
    } catch (err) {
      console.error('Lỗi khi xóa vật tư:', err);
      if (toast) toast('error', 'Không thể xóa vật tư');
    }
  };

  // Hàm xuất Excel Định mức vật tư chuẩn cho riêng sản phẩm này
  const handleExportMaterialBOM = () => {
    if (!materialRows || materialRows.length === 0) {
      if (toast) toast('warning', 'Không có dữ liệu định mức vật tư để xuất Excel!');
      return;
    }

    try {
      const pSku = formData.sku || product?.sku || `SP_${id}`;
      const pName = formData.name || product?.name || 'Sản phẩm';

      // Chuẩn hóa dữ liệu xuất Excel
      const exportData = materialRows.map((m, idx) => ({
        'STT': m.stt || idx + 1,
        'Nhóm vật tư': m.group_type || 'VẬT TƯ HÀNG TRẮNG',
        'Mã vật tư': m.material_code || '',
        'Tên vật tư / Phụ kiện': m.material_name || m.name || '',
        'Màu sắc / Xi mạ': m.color || '',
        'Định mức': m.quota || m.quantity || 1,
        'Đơn vị': m.unit || 'Cái',
        'Nhà cung cấp': m.supplier || '',
        'Ghi chú': m.note || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DinhMucVatTu');
      
      const cleanFileName = `Dinh_Muc_Vat_Tu_${pSku.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, cleanFileName);

      if (toast) toast('success', `Đã xuất file ${cleanFileName} thành công!`);
    } catch (err) {
      console.error('Lỗi xuất Excel vật tư:', err);
      if (toast) toast('error', 'Lỗi xuất Excel: ' + err.message);
    }
  };

  // Hàm Import Excel tự động có Thanh tiến trình Upload toàn cục & Chọn Sheet
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // 1. Quét nhanh metadata các sheet trong file Excel
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const authHeaders = { 'ngrok-skip-browser-warning': 'true' };
      if (token && token !== 'null' && token !== 'undefined') {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}master-products/inspect-excel-sheets`, {
        method: 'POST',
        body: formData,
        headers: authHeaders
      });

      if (response.ok) {
        const inspectRes = await response.json();
        if (inspectRes && inspectRes.sheets && inspectRes.sheets.length > 1) {
          // Nhiều sheet: Mở Modal cho người dùng chọn sheet mong muốn
          setSheetModal({
            visible: true,
            file: file,
            sheets: inspectRes.sheets
          });
          return;
        }
      }

      if (startGlobalUpload) {
        await startGlobalUpload(
          file, 
          '/master-products/import-excel', 
          () => {
            fetchProduct();
            if (toast) toast('success', 'Đã nhập dữ liệu BOM & Vật tư từ Excel thành công!');
          }
        );
      } else {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        await api.post('/master-products/import-excel', formDataUpload);
        fetchProduct();
        if (toast) toast('success', 'Đã nhập dữ liệu BOM & Vật tư từ Excel thành công!');
      }
    } catch (error) {
      console.error('Lỗi khi upload file Excel:', error);
      if (toast) toast('error', 'Lỗi khi nhập dữ liệu Excel');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmSheetImport = async (selectedSheets) => {
    const targetFile = sheetModal.file;
    setSheetModal({ visible: false, file: null, sheets: [] });
    if (!targetFile) return;

    try {
      if (startGlobalUpload) {
        await startGlobalUpload(
          targetFile,
          '/master-products/import-excel',
          () => {
            fetchProduct();
            if (toast) toast('success', 'Đã nhập dữ liệu BOM từ các Sheet đã chọn!');
          },
          { sheets: JSON.stringify(selectedSheets) }
        );
      }
    } catch (error) {
      console.error('Lỗi upload sheets:', error);
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
      return sonOnly.map(formatItem);
    }

    if (activeLower.includes('đóng gói') || activeLower.includes('gói')) {
      const pkgOnly = enrichedRows.filter(i => i.isPackaging || i.level === 0);
      return pkgOnly.map(formatItem);
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

    return enrichedRows.map(formatItem);
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

  // Upload Ảnh chính và Thumbnail cho sản phẩm
  const handleImageUpload = async (e, isMain = true, thumbIndex = 0) => {
    const file = e.target.files[0];
    if (!file) return;

    // Hiển thị preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);
    if (isMain) {
      setMainImage(previewUrl);
    } else {
      setSubImages(prev => {
        const updated = [...prev];
        updated[thumbIndex] = previewUrl;
        return updated;
      });
    }

    // Tải ảnh trực tiếp lên Backend /master-products/upload-image
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const res = await api.post('/master-products/upload-image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res && res.url) {
        if (isMain) {
          setMainImage(res.url);
          // Tự động cập nhật ngay URL ảnh vào sản phẩm
          await api.put(`/master-products/${id}`, { image_url: res.url }).catch(() => {});
        } else {
          setSubImages(prev => {
            const updated = [...prev];
            updated[thumbIndex] = res.url;
            return updated;
          });
        }
        if (toast) toast('success', 'Đã tải lên ảnh sản phẩm thành công!');
      }
    } catch (error) {
      console.warn('Lỗi khi upload ảnh lên server, chuyển sang base64 fallback:', error);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (isMain) {
          setMainImage(reader.result);
          await api.put(`/master-products/${id}`, { image_url: reader.result }).catch(() => {});
        } else {
          setSubImages(prev => {
            const updated = [...prev];
            updated[thumbIndex] = reader.result;
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Xử lý nạp dữ liệu từ sản phẩm mẫu khác
  const handleApplyFromProduct = (sourceProduct, options = {}) => {
    if (!sourceProduct) return;

    // 1. Sao chép Thông tin chung & Quy cách
    if (options.copyGeneralInfo) {
      setFormData(prev => {
        const nextLine = sourceProduct.brand_name || sourceProduct.category_name || prev.line;
        const nextCat = sourceProduct.category_name || (sourceProduct.master_category && sourceProduct.master_category.name) || prev.category;
        return {
          ...prev,
          line: nextLine,
          category: nextCat,
          length: (sourceProduct.length !== undefined && sourceProduct.length !== null) ? String(sourceProduct.length) : prev.length,
          width: (sourceProduct.width !== undefined && sourceProduct.width !== null) ? String(sourceProduct.width) : prev.width,
          height: (sourceProduct.height !== undefined && sourceProduct.height !== null) ? String(sourceProduct.height) : prev.height,
          weight: sourceProduct.weight ? `${sourceProduct.weight} kg` : prev.weight,
          color: sourceProduct.color || prev.color,
          note: sourceProduct.specification || sourceProduct.description || prev.note,
          bomStatus: sourceProduct.status || prev.bomStatus,
          estimatedCost: sourceProduct.price ? Number(String(sourceProduct.price).replace(/\D/g, '')).toLocaleString('vi-VN') : prev.estimatedCost
        };
      });
    }

    // 2. Sao chép Cây cấu trúc BOM linh kiện
    if (options.copyBOM && sourceProduct.master_bom_details && sourceProduct.master_bom_details.length > 0) {
      const processed = processBackendBOM(sourceProduct.master_bom_details);
      if (processed.length > 0) {
        const currentSkuPrefix = formData.sku || `ADV${id}`;
        const finalBOM = options.syncSKUPrefix
          ? processed.map(row => ({
              ...row,
              compCode: row.stt === '1' ? currentSkuPrefix : `${currentSkuPrefix}.${row.stt}`
            }))
          : processed;

        setBomRows(finalBOM);
        setFormData(prev => ({ ...prev, totalComponents: String(finalBOM.length) }));
      }
    }

    // 3. Sao chép Chi tiết sản phẩm (KT03.1)
    if (options.copyDetails && Array.isArray(sourceProduct.product_details)) {
      setDetailRows(sourceProduct.product_details.map(d => ({
        id: d.id,
        name: d.name,
        quantity: d.quantity,
        unit: d.unit || 'Cái',
        input_stage: d.input_stage,
        output_stage: d.output_stage,
        parent_name: d.parent_name,
        material: d.material
      })));
    }

    // 4. Sao chép Mẫu màu sơn (KT03.3)
    if (options.copyPaintColors && Array.isArray(sourceProduct.paint_color_samples)) {
      setPaintColorRows(sourceProduct.paint_color_samples.map(p => ({
        id: p.id,
        color_code: p.color_code,
        color_name: p.color_name,
        supplier: p.supplier,
        image_url: p.image_url,
        note: p.note
      })));
    }

    if (toast) {
      toast('success', `Đã nạp thông tin từ sản phẩm "${sourceProduct.sku} - ${sourceProduct.name}" thành công!`);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartEdit = () => {
    setOriginalData({
      formData: { ...formData },
      bomRows: JSON.parse(JSON.stringify(bomRows)),
      mainImage: mainImage
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (originalData) {
      if (originalData.formData) setFormData(originalData.formData);
      if (originalData.bomRows) setBomRows(originalData.bomRows);
      if (originalData.mainImage !== undefined) setMainImage(originalData.mainImage);
    }
    setIsEditing(false);
  };

  const handleSaveInfo = async () => {
    if (!formData.name?.trim() || !formData.sku?.trim()) {
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
        image_url: mainImage,
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
            output_stage: r.stageFrom, // Công đoạn giao
            input_stage: r.stageTo,    // Công đoạn nhận
            description: r.note || ''
          })),
        materials: materialRows.map((m, idx) => ({
          id: m.id || null,
          stt: m.stt || idx + 1,
          group_type: m.group_type || 'VẬT TƯ HÀNG TRẮNG',
          material_code: m.material_code || '',
          material_name: m.material_name || m.name || '',
          color: m.color || '',
          quota: parseFloat(m.quota || m.quantity || 1.0) || 1.0,
          unit: m.unit || 'Cái',
          supplier: m.supplier || '',
          note: m.note || ''
        }))
      };

      await api.put(`/master-products/${id}`, payload);
      if (toast) toast('success', 'Lưu thông tin sản phẩm thành công!');
      setIsEditing(false);
      fetchProduct();
    } catch (err) {
      console.error('Lỗi lưu thông tin sản phẩm:', err);
      if (toast) toast('error', 'Lưu thông tin thất bại: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

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
    <div className="product-detail-container detail-view-container" style={{ backgroundColor: '#FAF6F1', padding: '12px 16px 16px 16px', boxSizing: 'border-box' }}>
      <div className="mgmt-main" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* KHUNG 1: THÔNG TIN CHUNG (CHUẨN MOCKUP 1 - TỐI ƯU COMPACT VỀ CHIỀU CAO) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          padding: '12px 18px',
          boxShadow: '0 2px 10px rgba(45, 26, 18, 0.03)'
        }}>
          {/* Header Card + Nút Thao Tác Bên Phải */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12' }}>
                Thông tin chung
              </h3>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: isEditing ? '#FEF3C7' : '#F1F5F9',
                color: isEditing ? '#92400E' : '#475569',
                border: isEditing ? '1px solid #FCD34D' : '1px solid #E2E8F0'
              }}>
                {isEditing ? '● Đang chỉnh sửa' : '○ Chỉ xem'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
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

              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
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
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      padding: '7px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #EF4444',
                      borderRadius: '8px',
                      color: '#EF4444',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={15} /> Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveInfo}
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
                    <Save size={15} /> {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                  </button>
                </>
              )}
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
                disabled={!isEditing}
                onChange={(e) => handleImageUpload(e, true)}
              />

              {/* Ô ảnh chính vuông lớn */}
              <div
                onClick={() => isEditing && fileInputRef.current && fileInputRef.current.click()}
                title={isEditing ? 'Nhấn để thay đổi ảnh' : undefined}
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
                  cursor: isEditing ? 'pointer' : 'default',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {mainImage ? (
                  <>
                    <img
                      src={mainImage.startsWith('/') ? `${getBaseURL().replace(/\/api\/v1\/?$/, '')}${mainImage}` : mainImage}
                      alt="Main Product"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setMainImage(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          await api.put(`/master-products/${id}`, { image_url: '' }).catch(() => {});
                          if (toast) toast('info', 'Đã xóa ảnh sản phẩm');
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          zIndex: 10
                        }}
                        title="Xóa ảnh"
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Box size={52} style={{ strokeWidth: 1.5 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', marginTop: '4px' }}>
                      {isEditing ? 'Tải ảnh chính' : 'Chưa có ảnh'}
                    </span>
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
                      cursor: isEditing ? 'pointer' : 'default'
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

            {/* Form 7 Ô Nhập: Bố cục 2 Hàng (Hàng 1: 3 ô, Hàng 2: 4 ô) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              {/* Hàng 1: 3 Ô Nhập (Mã SKU | Phân loại | Tên sản phẩm) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Mã sản phẩm (SKU) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    placeholder="VD: ADV1234..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Phân loại
                  </label>
                  <select
                    name="category"
                    value={formData.category || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">-- Chọn phân loại --</option>
                    {categoriesOptions.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Tên sản phẩm <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    placeholder="VD: Bàn ăn 6 ghế gỗ sồi..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>

              {/* Hàng 2: 4 Ô Nhập (Kích thước | Màu sơn | Dự toán chi phí | Ghi chú) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1.2fr 1.6fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Kích thước (D x R x C mm)
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      name="length"
                      value={formData.length || ''}
                      disabled={!isEditing}
                      onChange={handleInputChange}
                      placeholder="Dài"
                      style={{
                        width: '33%',
                        padding: '6px 4px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                        cursor: !isEditing ? 'not-allowed' : 'text'
                      }}
                    />
                    <input
                      type="number"
                      name="width"
                      value={formData.width || ''}
                      disabled={!isEditing}
                      onChange={handleInputChange}
                      placeholder="Rộng"
                      style={{
                        width: '33%',
                        padding: '6px 4px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                        cursor: !isEditing ? 'not-allowed' : 'text'
                      }}
                    />
                    <input
                      type="number"
                      name="height"
                      value={formData.height || ''}
                      disabled={!isEditing}
                      onChange={handleInputChange}
                      placeholder="Cao"
                      style={{
                        width: '33%',
                        padding: '6px 4px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                        cursor: !isEditing ? 'not-allowed' : 'text'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Màu sơn
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    placeholder="VD: Tự nhiên, Walnut..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Ước tính chi phí (VND)
                  </label>
                  <input
                    type="text"
                    name="estimatedCost"
                    value={formData.estimatedCost || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#5D3B32', marginBottom: '3px' }}>
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    name="note"
                    value={formData.note || ''}
                    disabled={!isEditing}
                    onChange={handleInputChange}
                    placeholder="Ghi chú kỹ thuật..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.84rem',
                      backgroundColor: !isEditing ? '#F3F4F6' : '#FFFFFF',
                      color: '#1F2937',
                      cursor: !isEditing ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>
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
            BOM sản phẩm
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

                <input type="file" ref={excelInputRef} accept=".xlsx, .xls" style={{ display: 'none' }} disabled={!isEditing} onChange={handleImportExcel} />
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => isEditing && excelInputRef.current && excelInputRef.current.click()}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title={isEditing ? 'Nhập dữ liệu Excel' : 'Bật chế độ Chỉnh sửa để nhập dữ liệu'}
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
                  disabled={!isEditing}
                  onClick={() => isEditing && handleAddMainBomRow()}
                  style={{
                    padding: '7px 16px',
                    backgroundColor: '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '0.82rem',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isEditing ? '0 3px 8px rgba(93, 59, 50, 0.2)' : 'none'
                  }}
                  title={isEditing ? 'Thêm chi tiết' : 'Bật chế độ Chỉnh sửa để thêm chi tiết'}
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
              marginBottom: '0px'
            }}>
              <div style={{
                overflowX: 'auto',
                overflowY: 'auto',
                minHeight: '280px',
                maxHeight: 'calc(100vh - 440px)',
                borderRadius: '10px',
                paddingBottom: '0px'
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
                    {isFetchingBom ? (
                      <tr>
                        <td colSpan={13} style={{ textAlign: 'center', padding: '3.5rem', color: '#7B5233' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '700', fontSize: '0.95rem' }}>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              border: '2.5px solid #EADCC9',
                              borderTop: '2.5px solid #7B5233',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            Đang tải dữ liệu linh kiện BOM...
                          </div>
                        </td>
                      </tr>
                    ) : filteredBomRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                          Không tìm thấy linh kiện BOM phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredBomRows.map((row, index) => {
                        const isRootRow = (index === 0);
                        const isRowDisabled = isRootRow || !isEditing;
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => {
                                    if (isRowDisabled) return;
                                    const numericDotVal = e.target.value.replace(/[^0-9.]/g, '').replace(/\.{2,}/g, '.');
                                    updateBomRow(row.id, 'stt', numericDotVal);
                                  }}
                                  onKeyDown={(e) => {
                                    if (isRowDisabled) return;
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
                                    cursor: isRowDisabled ? 'default' : 'text'
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
                                    readOnly={isRowDisabled}
                                    disabled={isRowDisabled}
                                    onChange={(e) => {
                                      if (isRowDisabled) return;
                                      updateBomRow(row.id, 'type', e.target.value);
                                      if (levelDepth > 0) setActiveTypeRow(row.id);
                                    }}
                                    onFocus={() => {
                                      if (isRowDisabled || levelDepth === 0) return;
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
                                      if (isRowDisabled || levelDepth === 0) return;
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
                                      backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                      color: isRootRow ? '#4B5563' : '#1F2937',
                                      fontWeight: isRootRow ? '700' : 'normal',
                                      cursor: isRowDisabled ? 'not-allowed' : 'text'
                                    }}
                                  />
                                  {!isRowDisabled && activeTypeRow === row.id && levelDepth > 0 && (() => {
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
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'stageFrom', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFF',
                                    fontWeight: '600',
                                    color: isRowDisabled ? '#4B5563' : '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'pointer',
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
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'stageTo', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFF',
                                    fontWeight: '600',
                                    color: isRowDisabled ? '#4B5563' : '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'pointer',
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'compCode', e.target.value)}
                                  placeholder="Mã TP..."
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    color: '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                      readOnly={isRowDisabled}
                                      disabled={isRowDisabled}
                                      onChange={(e) => {
                                        if (isRowDisabled) return;
                                        updateBomRow(row.id, 'compName', e.target.value);
                                        if (levelDepth > 0) setActiveCompNameRow(row.id);
                                      }}
                                      onFocus={() => {
                                        if (isRowDisabled || levelDepth === 0) return;
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
                                        if (isRowDisabled || levelDepth === 0) return;
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
                                        backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                        color: levelDepth === 0 ? '#5D3B32' : '#1F2937',
                                        cursor: isRowDisabled ? 'not-allowed' : 'text'
                                      }}
                                    />
                                    {!isRowDisabled && activeCompNameRow === row.id && levelDepth > 0 && (() => {
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'quantity', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    fontWeight: '700',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    color: isRowDisabled ? '#4B5563' : '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'unit', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    color: isRowDisabled ? '#4B5563' : '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'material', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    color: isRowDisabled ? '#4B5563' : '#1F2937',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                    readOnly={isRowDisabled}
                                    disabled={isRowDisabled}
                                    onChange={(e) => {
                                      if (isRowDisabled) return;
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
                                      backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                      cursor: isRowDisabled ? 'not-allowed' : 'text'
                                    }}
                                  />
                                  <input
                                    type="number"
                                    placeholder="R"
                                    value={row.width || ''}
                                    readOnly={isRowDisabled}
                                    disabled={isRowDisabled}
                                    onChange={(e) => {
                                      if (isRowDisabled) return;
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
                                      backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                      cursor: isRowDisabled ? 'not-allowed' : 'text'
                                    }}
                                  />
                                  <input
                                    type="number"
                                    placeholder="C"
                                    value={row.height || ''}
                                    readOnly={isRowDisabled}
                                    disabled={isRowDisabled}
                                    onChange={(e) => {
                                      if (isRowDisabled) return;
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
                                      backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                      cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'volume', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    color: '#6B7280',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                  readOnly={isRowDisabled}
                                  disabled={isRowDisabled}
                                  onChange={(e) => updateBomRow(row.id, 'note', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: isRowDisabled ? '#F9FAFB' : '#FFFFFF',
                                    cursor: isRowDisabled ? 'not-allowed' : 'text'
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
                                    disabled={!isEditing}
                                    onClick={() => isEditing && handleAddSubBomRow(row)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: isEditing ? 'pointer' : 'not-allowed',
                                      opacity: isEditing ? 1 : 0.35,
                                      color: '#5D3B32',
                                      padding: '3px'
                                    }}
                                    title={isEditing ? 'Thêm chi tiết con' : 'Bật chế độ Chỉnh sửa'}
                                  >
                                    <Plus size={15} />
                                  </button>
                                  {!isRootRow && (
                                    <button
                                      type="button"
                                      disabled={!isEditing}
                                      onClick={() => isEditing && handleDeleteBomRow(row.id)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: isEditing ? 'pointer' : 'not-allowed',
                                        opacity: isEditing ? 1 : 0.35,
                                        color: '#EF4444',
                                        padding: '3px'
                                      }}
                                      title={isEditing ? 'Xóa dòng' : 'Bật chế độ Chỉnh sửa'}
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
                    {isFetchingBom ? (
                      <tr>
                        <td colSpan={13} style={{ textAlign: 'center', padding: '3.5rem', color: '#7B5233' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '700', fontSize: '0.95rem' }}>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              border: '2.5px solid #EADCC9',
                              borderTop: '2.5px solid #7B5233',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            Đang tải quy trình công đoạn...
                          </div>
                        </td>
                      </tr>
                    ) : displayItems.length === 0 ? (
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
        ) : activeTab === 'materials' ? (
          /* TAB 4: ĐỊNH MỨC VẬT TƯ (BOM PHỤ KIỆN HÀNG TRẮNG & SAU SƠN CHUẨN G7) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* KPI STATS BAR & ACTION TOOLBAR */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #EADCC9',
              padding: '14px 20px',
              boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Left: 4 Metric Cards */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Tổng phụ kiện */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={20} color="#5D3B32" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#7B5233', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tổng phụ kiện</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#2D1A12' }}>
                      {materialRows.length} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>mục</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: '32px', width: '1px', backgroundColor: '#EADCC9' }} />

                {/* Hàng trắng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={20} color="#1D4ED8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Hàng trắng</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1E3A8A' }}>
                      {materialRows.filter(m => (m.group_type || '').toUpperCase().includes('TRẮNG')).length} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>mục</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: '32px', width: '1px', backgroundColor: '#EADCC9' }} />

                {/* Sau sơn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Palette size={20} color="#15803D" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Sau sơn</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#14532D' }}>
                      {materialRows.filter(m => (m.group_type || '').toUpperCase().includes('SƠN')).length} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>mục</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: '32px', width: '1px', backgroundColor: '#EADCC9' }} />

                {/* Tổng định mức */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sliders size={20} color="#B45309" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tổng định mức</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#78350F' }}>
                      {materialRows.reduce((acc, m) => acc + (parseFloat(m.quota || m.quantity || 0) || 0), 0)} <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#64748B' }}>phụ kiện</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Search, Filter & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Ô tìm kiếm nội bộ Tab vật tư */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="Tìm tên VT, mã, màu, NCC..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 28px 7px 32px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      backgroundColor: '#FAF6F0',
                      color: '#2D1A12',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search size={15} color="#7B5233" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  {materialSearch && (
                    <button
                      type="button"
                      onClick={() => setMaterialSearch('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Bộ lọc nhóm vật tư */}
                <select
                  value={materialGroupFilter}
                  onChange={(e) => setMaterialGroupFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    backgroundColor: '#FAF6F0',
                    color: '#2D1A12',
                    fontWeight: '700',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">Tất cả các nhóm</option>
                  <option value="HANG_TRANG">Chỉ Hàng Trắng</option>
                  <option value="SAU_SON">Chỉ Sau Sơn</option>
                </select>

                {/* Nút Xuất Excel */}
                <button
                  type="button"
                  onClick={handleExportMaterialBOM}
                  style={{
                    padding: '7px 14px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F172A',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  title="Xuất danh mục định mức vật tư ra file Excel"
                >
                  <FileSpreadsheet size={16} color="#15803D" /> Xuất Excel
                </button>

                {/* Nút Thêm vật tư mới */}
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => {
                    if (!isEditing) return;
                    setEditingMaterial(null);
                    setDefaultMaterialGroup('VẬT TƯ HÀNG TRẮNG');
                    setShowAddMaterialModal(true);
                  }}
                  style={{
                    padding: '7px 16px',
                    backgroundColor: '#5D3B32',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isEditing ? '0 3px 8px rgba(93, 59, 50, 0.2)' : 'none'
                  }}
                  title={isEditing ? 'Thêm vật tư mới' : 'Bật chế độ Chỉnh sửa để thêm vật tư'}
                >
                  <Plus size={16} /> Thêm vật tư mới
                </button>
              </div>
            </div>

            {/* BẢNG CÁC NHÓM VẬT TƯ */}
            {(() => {
              // 1. Phân nhóm vật tư
              const rawGroups = {
                'VẬT TƯ HÀNG TRẮNG': [],
                'VẬT TƯ SAU SƠN': []
              };

              materialRows.forEach(mat => {
                const gName = (mat.group_type || 'VẬT TƯ HÀNG TRẮNG').toUpperCase();
                if (!rawGroups[gName]) rawGroups[gName] = [];
                rawGroups[gName].push(mat);
              });

              // 2. Lọc theo Group Filter
              let activeGroupKeys = Object.keys(rawGroups);
              if (materialGroupFilter === 'HANG_TRANG') {
                activeGroupKeys = activeGroupKeys.filter(k => k.includes('TRẮNG'));
              } else if (materialGroupFilter === 'SAU_SON') {
                activeGroupKeys = activeGroupKeys.filter(k => k.includes('SƠN'));
              }

              // 3. Render các nhóm
              return activeGroupKeys.map((gName, gIdx) => {
                const allGroupItems = rawGroups[gName] || [];
                
                // Lọc theo từ khóa tìm kiếm
                const searchLower = materialSearch.trim().toLowerCase();
                const filteredItems = allGroupItems.filter(row => {
                  if (!searchLower) return true;
                  const nameMatch = (row.material_name || row.name || '').toLowerCase().includes(searchLower);
                  const codeMatch = (row.material_code || '').toLowerCase().includes(searchLower);
                  const colorMatch = (row.color || '').toLowerCase().includes(searchLower);
                  const suppMatch = (row.supplier || '').toLowerCase().includes(searchLower);
                  const noteMatch = (row.note || '').toLowerCase().includes(searchLower);
                  return nameMatch || codeMatch || colorMatch || suppMatch || noteMatch;
                });

                const isHangTrang = gName.includes('TRẮNG');
                const badgeBg = isHangTrang ? '#EFF6FF' : '#F0FDF4';
                const badgeColor = isHangTrang ? '#1D4ED8' : '#15803D';
                const badgeBorder = isHangTrang ? '#BFDBFE' : '#BBF7D0';
                const headerBarColor = isHangTrang ? '#2563EB' : '#16A34A';

                return (
                  <div
                    key={gName || gIdx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #EADCC9',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
                      marginBottom: '12px'
                    }}
                  >
                    {/* Header Nhóm */}
                    <div style={{
                      padding: '10px 18px',
                      backgroundColor: '#FAF6F0',
                      borderBottom: '1.5px solid #EADCC9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '18px', borderRadius: '4px', backgroundColor: headerBarColor }} />
                        <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {gName}
                        </h4>
                        <span style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          borderRadius: '12px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          border: `1px solid ${badgeBorder}`
                        }}>
                          {allGroupItems.length} mục
                        </span>
                      </div>

                      {/* Nút thêm nhanh cho nhóm này */}
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={() => {
                          if (!isEditing) return;
                          setEditingMaterial(null);
                          setDefaultMaterialGroup(gName);
                          setShowAddMaterialModal(true);
                        }}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: isHangTrang ? '#EFF6FF' : '#F0FDF4',
                          border: `1px solid ${badgeBorder}`,
                          borderRadius: '6px',
                          color: badgeColor,
                          fontWeight: '700',
                          fontSize: '0.78rem',
                          cursor: isEditing ? 'pointer' : 'not-allowed',
                          opacity: isEditing ? 1 : 0.45,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={isEditing ? `Thêm nhanh vật tư vào ${gName}` : 'Bật chế độ Chỉnh sửa để thêm'}
                      >
                        <Plus size={14} /> Thêm vào nhóm này
                      </button>
                    </div>

                    {/* Table Nội dung */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '55px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', width: '140px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã vật tư</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên vật tư / Phụ kiện</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', width: '150px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Màu sắc / Xi mạ</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Định mức</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', width: '140px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Nhà cung cấp</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ghi chú</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', width: '85px', fontWeight: '700' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isFetchingBom ? (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#7B5233' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: '700', fontSize: '0.9rem' }}>
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    border: '2.5px solid #EADCC9',
                                    borderTop: '2.5px solid #7B5233',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }}></div>
                                  Đang tải định mức vật tư...
                                </div>
                              </td>
                            </tr>
                          ) : filteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontWeight: '600' }}>
                                {materialSearch ? `Không tìm thấy vật tư nào khớp với từ khóa "${materialSearch}"` : `Chưa có vật tư nào trong nhóm ${gName}. Nhấn "+ Thêm vào nhóm này" để thêm mới.`}
                              </td>
                            </tr>
                          ) : (
                            filteredItems.map((row, idx) => (
                              <tr key={row.id || idx} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#2D1A12' }}>
                                  {row.stt || idx + 1}
                                </td>
                                <td style={{ padding: '8px 12px', fontWeight: '800', color: '#7B5233', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                                  {row.material_code || '---'}
                                </td>
                                <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1E293B' }}>
                                  {row.material_name || row.name || '---'}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>
                                  {row.color ? (
                                    <span style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', border: '1px solid #E2E8F0' }}>
                                      {row.color}
                                    </span>
                                  ) : '---'}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '900', color: '#2D1A12', fontSize: '0.92rem' }}>
                                  {row.quota || row.quantity || 1}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                                  {row.unit || 'Cái'}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#475569' }}>
                                  {row.supplier || '---'}
                                </td>
                                <td style={{ padding: '8px 12px', color: '#64748B' }}>
                                  {row.note || '---'}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={!isEditing}
                                      onClick={() => {
                                        if (!isEditing) return;
                                        setEditingMaterial(row);
                                        setDefaultMaterialGroup(row.group_type || gName);
                                        setShowAddMaterialModal(true);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#3B82F6',
                                        cursor: isEditing ? 'pointer' : 'not-allowed',
                                        opacity: isEditing ? 1 : 0.35,
                                        padding: '4px'
                                      }}
                                      title={isEditing ? 'Chỉnh sửa vật tư' : 'Bật chế độ Chỉnh sửa để sửa'}
                                    >
                                      <Sliders size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!isEditing}
                                      onClick={() => {
                                        if (!isEditing) return;
                                        handleDeleteMaterial(row.id, idx);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#EF4444',
                                        cursor: isEditing ? 'pointer' : 'not-allowed',
                                        opacity: isEditing ? 1 : 0.35,
                                        padding: '4px'
                                      }}
                                      title={isEditing ? 'Xóa vật tư' : 'Bật chế độ Chỉnh sửa để xóa'}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}

          </div>
        ) : (
          /* TAB 3: BẢN VẼ KỸ THUẬT TẠM THỜI TRỐNG */
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

      {showAddMaterialModal && (
        <AddMaterialModal
          productId={id}
          editMaterial={editingMaterial}
          defaultGroupType={defaultMaterialGroup}
          nextStt={materialRows.length + 1}
          onClose={() => {
            setShowAddMaterialModal(false);
            setEditingMaterial(null);
          }}
          onSuccess={fetchProduct}
        />
      )}


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

      {/* COPY FROM OTHER PRODUCT MODAL */}
      <CopyProductModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        onApply={handleApplyFromProduct}
        currentSku={formData.sku}
      />

      {/* SELECT SHEETS MODAL */}
      {sheetModal.visible && (
        <SelectSheetsModal
          file={sheetModal.file}
          sheets={sheetModal.sheets}
          onClose={() => setSheetModal({ visible: false, file: null, sheets: [] })}
          onConfirm={handleConfirmSheetImport}
        />
      )}
    </div>
  );
};

export default ProductDetailView;
