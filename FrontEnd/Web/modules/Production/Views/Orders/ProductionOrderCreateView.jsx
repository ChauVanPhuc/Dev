import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Pencil, Download, Upload, Send, ChevronDown, Eye, Plus, ArrowRight
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { planService } from '@modules/Plan/Models/plan.service';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

/**
 * View: Tạo / Chi tiết Lệnh sản xuất (/admin/production-orders/create hoặc /admin/production-orders/edit/:id)
 * Mã màn hình: SX02.1
 */
const ProductionOrderCreateView = () => {
  const { id: editingOrderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  const { toast } = useToast();

  const isEditMode = Boolean(editingOrderId);

  // Synchronize screen metadata from SSOT registry
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-orders/create');

  // Configure Header Navigation & Dynamic Titles
  useEffect(() => {
    const codeVal = screenCode || 'SX02.1';
    const subVal = isEditMode ? `${codeVal}: Chi tiết lệnh sản xuất` : `${codeVal}: Tạo lệnh sản xuất`;

    if (setCustomTitle) setCustomTitle(title || 'Tạo mới / Chi tiết Lệnh sản xuất');
    if (setCustomSubtitle) setCustomSubtitle(subVal);
    if (setCustomScreenCode) setCustomScreenCode(codeVal);
  }, [isEditMode, screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form Thông tin chung
  const [orderForm, setOrderForm] = useState({
    code: '',
    orderId: '',
    priority: 'Bình thường',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'Đang sản xuất'
  });

  // Active Main Tab bên dưới Thông tin chung
  const [activeMainTab, setActiveMainTab] = useState('order_info');

  // Bảng 1: Thông tin đơn hàng (Top Table)
  const [orderProducts, setOrderProducts] = useState([]);

  // Bảng 2: Chi tiết sản phẩm (Bottom Card & Table)
  const [productDetails, setProductDetails] = useState([]);

  // Sản phẩm đang được chọn ở Bảng 1 để lọc Bảng 2
  const [selectedProductCode, setSelectedProductCode] = useState(null);

  // PO Dropdown states
  const [purchaseRequisitions, setPurchaseRequisitions] = useState([]);
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const poDropdownRef = useRef(null);

  // Stage Options
  const defaultDbStages = [
    'NM1 - Tạo phôi 1', 'NM1 - Định hình mặt tiền 1', 'NM1 - Định hình tủ 1',
    'NM1 - Lắp ráp mặt tiền 1', 'NM1 - Lắp ráp tủ 1', 'NM1 - Sơn Pallet 1',
    'NM1 - Sơn treo 1', 'NM1 - Đóng gói 1', 'NM1 - QC / Kiểm định 1',
    'NM2 - Định hình mặt tiền 2', 'NM2 - Định hình tủ 2', 'NM2 - Lắp ráp mặt tiền 2',
    'NM2 - Lắp ráp tủ 2', 'NM2 - Sơn Pallet 2', 'NM2 - Sơn treo 2', 'NM2 - Đóng gói 2',
    'NM3 - Tạo phôi 3', 'NM3 - Định hình 3', 'NM3 - Lắp ráp 3', 'NM3 - Sơn 3', 'NM3 - Đóng gói 3'
  ];
  const [stageOptions, setStageOptions] = useState(defaultDbStages);

  useEffect(() => {
    const fetchStagesFromDb = async () => {
      try {
        const res = await api.get('/stages/').catch(() => api.get('/stages')).catch(() => null);
        if (res && Array.isArray(res) && res.length > 0) {
          const rawDbStages = res.map(s => (s.name || s.stage_name || '').trim()).filter(Boolean);
          const uniqueDbStages = Array.from(new Set(rawDbStages));
          if (uniqueDbStages.length > 0) setStageOptions(uniqueDbStages);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách công đoạn từ DB:', err);
      }
    };
    fetchStagesFromDb();
  }, []);

  const uniqueFactories = useMemo(() => {
    const extracted = stageOptions.map(stg => {
      const parts = stg.split(' - ');
      return parts.length > 1 ? parts[0].trim() : '';
    }).filter(Boolean);
    const unique = Array.from(new Set(extracted));
    return unique.length > 0 ? unique : ['NM1', 'NM2', 'NM3'];
  }, [stageOptions]);

  const getStagesForFactory = (factoryName, allStages = stageOptions) => {
    if (!factoryName) return allStages;
    const facClean = factoryName.trim().toUpperCase();
    const filtered = (allStages || []).filter(stg => {
      const upper = (stg || '').toUpperCase();
      return upper.startsWith(facClean + ' -') || upper.startsWith(facClean + ' ') || upper.startsWith(facClean + '-');
    });
    return filtered.length > 0 ? filtered : allStages;
  };

  const mapStageToFactory = (currentStageName, targetFactory, allStages = stageOptions, isOutputStage = false, oppositeStage = '') => {
    const targetStages = getStagesForFactory(targetFactory, allStages);
    if (!targetStages || targetStages.length === 0) return currentStageName || '';

    if (!currentStageName) {
      if (isOutputStage) {
        if (oppositeStage) {
          const oppIdx = targetStages.findIndex(s => s === oppositeStage);
          if (oppIdx >= 0 && oppIdx + 1 < targetStages.length) {
            return targetStages[oppIdx + 1];
          }
        }
        return targetStages[Math.min(1, targetStages.length - 1)];
      }
      return targetStages[0];
    }

    let coreName = currentStageName;
    if (currentStageName.includes(' - ')) {
      coreName = currentStageName.split(' - ').slice(1).join(' - ').trim();
    }
    const coreBase = coreName.replace(/\s*\d+$/, '').trim().toLowerCase();

    let matched = targetStages.find(stg => {
      const stgCore = stg.includes(' - ') ? stg.split(' - ').slice(1).join(' - ').toLowerCase() : stg.toLowerCase();
      const cleanStg = stgCore.replace(/\s*\d+$/, '');
      return stgCore.includes(coreBase) || (cleanStg.length >= 3 && coreBase.includes(cleanStg));
    });

    if (!matched) {
      if (coreBase.includes('phôi') || coreBase.includes('cắt') || coreBase.includes('xẻ')) {
        matched = targetStages.find(s => s.toLowerCase().includes('phôi')) || targetStages[0];
      } else if (coreBase.includes('định hình') || coreBase.includes('mộng') || coreBase.includes('tiện') || coreBase.includes('cnc') || coreBase.includes('chỉ') || coreBase.includes('khoan')) {
        matched = targetStages.find(s => s.toLowerCase().includes('định hình')) || targetStages[Math.min(1, targetStages.length - 1)];
      } else if (coreBase.includes('lắp') || coreBase.includes('khung') || coreBase.includes('nhám')) {
        matched = targetStages.find(s => s.toLowerCase().includes('lắp')) || targetStages[Math.min(2, targetStages.length - 1)];
      } else if (coreBase.includes('sơn') || coreBase.includes('bọc') || coreBase.includes('pu')) {
        matched = targetStages.find(s => s.toLowerCase().includes('sơn')) || targetStages[Math.min(3, targetStages.length - 1)];
      } else if (coreBase.includes('gói') || coreBase.includes('đóng') || coreBase.includes('qc') || coreBase.includes('hậu') || coreBase.includes('đế')) {
        matched = targetStages.find(s => s.toLowerCase().includes('đóng gói') || s.toLowerCase().includes('gói')) || targetStages[targetStages.length - 1];
      } else {
        matched = isOutputStage ? targetStages[Math.min(1, targetStages.length - 1)] : targetStages[0];
      }
    }

    if (isOutputStage && oppositeStage && matched === oppositeStage) {
      const oppIdx = targetStages.findIndex(s => s === oppositeStage);
      if (oppIdx >= 0 && oppIdx + 1 < targetStages.length) {
        matched = targetStages[oppIdx + 1];
      } else if (oppIdx > 0) {
        matched = targetStages[oppIdx - 1];
      }
    }

    return matched;
  };

  const mapStagePairToFactory = (fromName, toName, targetFactory, allStages = stageOptions) => {
    const sFrom = mapStageToFactory(fromName, targetFactory, allStages, false, '');
    const sTo = mapStageToFactory(toName, targetFactory, allStages, true, sFrom);
    return { stageFrom: sFrom, stageTo: sTo };
  };

  const handleChangeProductFactory = (pCode, newFactory) => {
    setOrderProducts(prev => prev.map(p => {
      if (p.productCode === pCode) {
        return { ...p, factory: newFactory };
      }
      return p;
    }));

    setProductDetails(prev => {
      const currentList = prev.filter(d => d.parentCode === pCode);
      const listToMap = currentList.length > 0 ? currentList : (displayedProductDetails.filter(d => d.parentCode === pCode));
      const updatedDetails = listToMap.map(det => {
        const pair = mapStagePairToFactory(det.stageFrom, det.stageTo, newFactory, stageOptions);
        return { ...det, ...pair };
      });
      const otherDetails = prev.filter(d => d.parentCode !== pCode);
      return [...otherDetails, ...updatedDetails];
    });

    if (toast) toast('info', `Đã chuyển sản phẩm ${pCode} sang ${newFactory} và cập nhật các công đoạn BOM tương ứng.`);
  };

  // State & Logic cho Tab Quy Trình - Kế Hoạch
  const [activeStage, setActiveStage] = useState('Định hình');
  const mainStages = ['Tạo phôi', 'Định hình', 'Lắp ráp', 'Sơn', 'Đóng gói', 'Lưu kho'];
  const [customScheduleRows, setCustomScheduleRows] = useState([]);

  const toISODate = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0].trim();
    if (val.includes('-') && val.length === 10) return val;
    const parts = (val || '').split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return val;
  };

  // Fetch Purchase Requisitions with backend search support
  useEffect(() => {
    let isMounted = true;
    const fetchPOList = async () => {
      try {
        const params = { limit: 100, order_type: 'Đơn bán hàng' };
        if (poSearch.trim()) {
          params.search = poSearch.trim();
        }
        const res = await purchasingService.getRequisitions(params).catch(() => null);
        if (isMounted && res && res.items) {
          const salesOrders = res.items.filter(item => {
            const typeStr = (item.order_type || item.type || '').toLowerCase();
            return !typeStr || typeStr.includes('bán');
          });
          setPurchaseRequisitions(salesOrders);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách Đơn bán hàng:', err);
      }
    };

    const timer = setTimeout(() => {
      fetchPOList();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [poSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (poDropdownRef.current && !poDropdownRef.current.contains(event.target)) {
        setIsPoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hàm xử lý và sắp xếp cây linh kiện BOM theo đúng phân cấp (1.1, 1.2, 1.1.1, 1.2.1...)
  const processBackendBOM = (items, parentCode = '', pIndex = 1) => {
    if (!items || !Array.isArray(items) || items.length === 0) return [];

    const itemMap = new Map();
    items.forEach(item => {
      if (item && item.id != null) {
        itemMap.set(item.id, item);
      }
    });

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

    const addNode = (item, currentStt, pCode = parentCode) => {
      const codeKey = `${item.id || currentStt}-${item.compCode || item.component_sku || item.sku || ''}`;
      if (!seenMap.has(codeKey)) {
        seenMap.set(codeKey, true);

        const isChild = currentStt.includes('.');
        const rowType = item.type || item.component_type || (isChild ? 'Chi tiết' : 'Sản phẩm');

        const rawFrom = item.stageFrom || item.input_stage || 'Tạo phôi';
        const rawTo = item.stageTo || item.output_stage || 'Định hình';
        const pair = mapStagePairToFactory(rawFrom, rawTo, item.factory || 'NM1', stageOptions);

        result.push({
          id: item.id || `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          parentCode: item.parentCode || pCode,
          parent_id: item.parent_id || null,
          stt: item.stt || item.tree_stt || currentStt,
          type: rowType,
          stageFrom: pair.stageFrom,
          stageTo: pair.stageTo,
          compCode: item.compCode || item.component_sku || item.sku || `SKU.${currentStt}`,
          compName: item.compName || item.name || 'Linh kiện',
          quantity: item.quantity !== undefined ? item.quantity : '1',
          unit: item.unit || 'Cái',
          material: item.material || 'Gỗ / MDF',
          spec: item.spec || item.specification || '',
          volume: item.volume !== undefined ? item.volume : 1,
          note: item.note || item.description || '',
          status: item.status || 'Chờ sản xuất'
        });
      }

      const kids = (hasParentId && item.id != null && childrenMap.has(item.id))
        ? childrenMap.get(item.id)
        : (item.children && Array.isArray(item.children) ? item.children : []);

      if (kids && kids.length > 0) {
        kids.forEach((child, cIdx) => {
          const childStt = `${currentStt}.${cIdx + 1}`;
          addNode(child, childStt, pCode);
        });
      }
    };

    roots.forEach((rootItem, rIdx) => {
      const rootStt = rootItem.stt || rootItem.tree_stt || `${pIndex}.${rIdx + 1}`;
      addNode(rootItem, rootStt, parentCode || rootItem.parentCode || '');
    });

    return result;
  };

  const generateBomForProduct = (pCode, pName = '', qtyVal = 50, pIndex = 1) => {
    const codeUpper = (pCode || '').toUpperCase();
    const nameUpper = (pName || '').toUpperCase();
    const displayName = pName || pCode || 'Sản phẩm';
    const prefix = `${pIndex}.`;

    if (codeUpper.includes('TABLE') || nameUpper.includes('TABLE') || nameUpper.includes('BÀN') || nameUpper.includes('DESK')) {
      return [
        { id: `${pCode}-1`, stt: `${prefix}1`, parentCode: pCode, type: 'Mặt bàn', stageFrom: 'Định hình', stageTo: 'Sơn PU', compCode: `${pCode}-MAT`, compName: `Mặt bàn gỗ sồi ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Gỗ Sồi (Oak)', spec: '25*900*1500', volume: 3.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, stt: `${prefix}2`, parentCode: pCode, type: 'Chân bàn', stageFrom: 'Tiện gỗ', stageTo: 'Lắp ráp', compCode: `${pCode}-CHAN`, compName: `Chân bàn vót nhọn ${displayName}`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Gỗ Sồi (Oak)', spec: '60*60*720', volume: 2.1, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, stt: `${prefix}3`, parentCode: pCode, type: 'Diềm bàn', stageFrom: 'Cắt mộng', stageTo: 'Lắp ráp', compCode: `${pCode}-DIEM`, compName: `Diềm khung bàn ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*70*1400', volume: 1.1, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, stt: `${prefix}4`, parentCode: pCode, type: 'Giằng ngang', stageFrom: 'Cắt mộng', stageTo: 'Lắp ráp', compCode: `${pCode}-GIANG`, compName: `Thanh giằng chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*70*800', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, stt: `${prefix}5`, parentCode: pCode, type: 'Ke liên kết', stageFrom: 'Lắp phụ kiện', stageTo: 'Đóng gói', compCode: `${pCode}-KE`, compName: `Bộ ke kim loại liên kết chân`, quantity: `0/${qtyVal * 4}`, unit: 'Bộ', material: 'Thép 3mm', spec: '50*50*50', volume: 0.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, stt: `${prefix}6`, parentCode: pCode, type: 'Nẹp viền', stageFrom: 'Dán nẹp', stageTo: 'Hoàn thiện', compCode: `${pCode}-NEP`, compName: `Nẹp viền mặt bàn gỗ tự nhiên`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Gỗ Sồi (Oak)', spec: '10*25*4800', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, stt: `${prefix}7`, parentCode: pCode, type: 'Đế đinh chân', stageFrom: 'Lắp đóng gói', stageTo: 'Đóng gói', compCode: `${pCode}-DE`, compName: `Đế cao su tăng chỉnh chân bàn`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Cao su + Thép', spec: 'M8*30', volume: 0.1, note: '', status: 'Chờ sản xuất' }
      ];
    }

    if (codeUpper.includes('CHAIR') || nameUpper.includes('CHAIR') || nameUpper.includes('GHẾ') || nameUpper.includes('STOOL') || nameUpper.includes('BENCH')) {
      return [
        { id: `${pCode}-1`, stt: `${prefix}1`, parentCode: pCode, type: 'Nan tựa', stageFrom: 'Uốn cong', stageTo: 'Lắp ráp', compCode: `${pCode}-TUA-01`, compName: `Nan tựa lưng uốn cong ${displayName}`, quantity: `0/${qtyVal * 3}`, unit: 'Nan', material: 'Gỗ Tần Bì (Ash)', spec: '12*40*450', volume: 0.5, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-2`, stt: `${prefix}2`, parentCode: pCode, type: 'Khung tựa', stageFrom: 'Định hình', stageTo: 'Lắp ráp', compCode: `${pCode}-TUA-02`, compName: `Khung viền tựa lưng ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Bộ', material: 'Gỗ Tần Bì (Ash)', spec: '25*45*500', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-3`, stt: `${prefix}3`, parentCode: pCode, type: 'Mặt nệm', stageFrom: 'Định hình', stageTo: 'Bọc đệm', compCode: `${pCode}-MAT-01`, compName: `Mặt đệm mút bọc da PU ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'Mút K43 + Da PU', spec: '50*420*420', volume: 1.2, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-4`, stt: `${prefix}4`, parentCode: pCode, type: 'Chân trước', stageFrom: 'Định hình', stageTo: 'Chà nhám', compCode: `${pCode}-CHF-01`, compName: `Chân ghế trước vót nhọn ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Cái', material: 'Gỗ Tần Bì (Ash)', spec: '40*40*450', volume: 0.8, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-5`, stt: `${prefix}5`, parentCode: pCode, type: 'Chân sau', stageFrom: 'Định hình', stageTo: 'Chà nhám', compCode: `${pCode}-CHS-01`, compName: `Chân ghế sau uốn cong ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Cái', material: 'Gỗ Tần Bì (Ash)', spec: '40*50*850', volume: 1.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-6`, stt: `${prefix}6`, parentCode: pCode, type: 'Giằng dọc', stageFrom: 'Cắt mộng', stageTo: 'Lắp khung', compCode: `${pCode}-GIANG-01`, compName: `Thanh giằng dọc chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Tần Bì (Ash)', spec: '25*30*400', volume: 0.4, note: '', status: 'Chờ sản xuất' },
        { id: `${pCode}-7`, stt: `${prefix}7`, parentCode: pCode, type: 'Giằng ngang', stageFrom: 'Cắt mộng', stageTo: 'Lắp khung', compCode: `${pCode}-GIANG-02`, compName: `Thanh giằng ngang liên kết ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Tần Bì (Ash)', spec: '25*30*380', volume: 0.4, note: '', status: 'Chờ sản xuất' }
      ];
    }

    return [
      { id: `${pCode}-1`, stt: `${prefix}1`, parentCode: pCode, type: 'Mặt tủ', stageFrom: 'Định hình', stageTo: 'Sơn PU', compCode: `${pCode}-MAT-01`, compName: `Mặt gỗ sồi tự nhiên ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Gỗ Sồi (Oak)', spec: '18*450*1200', volume: 2.5, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-2`, stt: `${prefix}2`, parentCode: pCode, type: 'Cánh tủ', stageFrom: 'Cắt CNC', stageTo: 'Lắp ráp', compCode: `${pCode}-CANH-01`, compName: `Cánh tủ ván soi chỉ nghệ thuật ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Cái', material: 'MDF Chống ẩm', spec: '15*380*650', volume: 1.8, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-3`, stt: `${prefix}3`, parentCode: pCode, type: 'Chân tủ', stageFrom: 'Tiện gỗ', stageTo: 'Lắp ráp', compCode: `${pCode}-CHAN-01`, compName: `Cụm chân gỗ tròn vót nhọn ${displayName}`, quantity: `0/${qtyVal * 4}`, unit: 'Cái', material: 'Gỗ Cao su', spec: '50*50*150', volume: 0.6, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-4`, stt: `${prefix}4`, parentCode: pCode, type: 'Vách hông trái', stageFrom: 'Định hình', stageTo: 'Khoan cam', compCode: `${pCode}-HONG-01`, compName: `Tấm vách hông bên trái ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*400*750', volume: 1.05, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-5`, stt: `${prefix}5`, parentCode: pCode, type: 'Vách hông phải', stageFrom: 'Định hình', stageTo: 'Khoan cam', compCode: `${pCode}-HONG-02`, compName: `Tấm vách hông bên phải ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*400*750', volume: 1.05, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-6`, stt: `${prefix}6`, parentCode: pCode, type: 'Tấm đáy tủ', stageFrom: 'Cắt ván', stageTo: 'Khoan lỗ', compCode: `${pCode}-DAY-01`, compName: `Tấm ván đáy tủ liên kết ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'MDF Kháng ẩm 17mm', spec: '17*450*1160', volume: 1.6, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-7`, stt: `${prefix}7`, parentCode: pCode, type: 'Khung đố nóc', stageFrom: 'Chạy chỉ', stageTo: 'Lắp ráp', compCode: `${pCode}-DO-01`, compName: `Thanh đố ngang nóc chịu lực ${displayName}`, quantity: `0/${qtyVal * 2}`, unit: 'Thanh', material: 'Gỗ Sồi (Oak)', spec: '25*50*1160', volume: 0.7, note: '', status: 'Chờ sản xuất' },
      { id: `${pCode}-8`, stt: `${prefix}8`, parentCode: pCode, type: 'Tấm hậu tủ', stageFrom: 'Cắt ván', stageTo: 'Đóng hậu', compCode: `${pCode}-HAU-01`, compName: `Tấm hậu tủ phủ Melamine ${displayName}`, quantity: `0/${qtyVal}`, unit: 'Tấm', material: 'Plywood 5mm', spec: '5*700*1160', volume: 0.9, note: '', status: 'Chờ sản xuất' }
    ];
  };

  // If in Edit Mode, fetch details
  useEffect(() => {
    if (!editingOrderId) return;
    const fetchOrderDetail = async () => {
      setLoadingDetail(true);
      try {
        // First check state from navigation
        const itemState = location.state?.item;
        let item = itemState;
        if (!item) {
          const res = await api.get(`/orders/${editingOrderId}`).catch(() => null);
          item = res;
        }

        if (item) {
          setOrderForm({
            code: item.code || item.orderNo || item.order_code || '',
            orderId: item.orderNo || item.code || item.order_code || '',
            priority: item.priority || (item.is_priority ? 'Cao' : 'Bình thường'),
            startDate: toISODate(item.startDate || item.create_date) || new Date().toISOString().split('T')[0],
            endDate: toISODate(item.endDate || item.estimated_date) || '',
            status: item.status || 'Đang sản xuất'
          });

          const defaultFac = uniqueFactories[0] || 'NM1';
          if (item.products && item.products.length > 0) {
            const formattedProducts = item.products.map((p, idx) => {
              const qty = Number(p.quantity || p.order_qty) || 0;
              const spare = p.spare_qty !== undefined ? Number(p.spare_qty) : Math.ceil(qty * 0.05);
              const total = p.total_qty !== undefined ? Number(p.total_qty) : (qty + spare);
              const code = p.sku || p.productCode || `SP-${idx + 1}`;
              return {
                id: p.id || idx + 1,
                productCode: code,
                productName: p.name || p.productName || 'Sản phẩm sản xuất',
                lineType: p.category || p.lineType || p.group_name || 'Nội thất',
                factory: p.factory || defaultFac,
                orderQty: qty,
                spareQty: spare,
                totalQty: total,
                unit: p.unit || 'Cái',
                startDate: toISODate(p.startDate || item.startDate) || new Date().toISOString().split('T')[0],
                endDate: toISODate(p.endDate || item.endDate) || '',
                deliveryDate: toISODate(p.deliveryDate || item.endDate) || '',
                drawingCode: p.drawingCode || p.drawing_code || `BV-${code}`
              };
            });

            const allBomDetails = item.products.flatMap((p, pIdx) => {
              const pCode = p.sku || p.productCode || `SP-${pIdx + 1}`;
              const bomItems = p.bom_details || p.master_bom_details || p.bom || [];
              if (Array.isArray(bomItems) && bomItems.length > 0) {
                return processBackendBOM(bomItems, pCode, pIdx + 1);
              }
              return generateBomForProduct(pCode, p.name || p.productName, p.quantity || 50, pIdx + 1);
            });

            setOrderProducts(formattedProducts);
            setProductDetails(allBomDetails);
            if (formattedProducts.length > 0) {
              setSelectedProductCode(formattedProducts[0].productCode);
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy chi tiết Lệnh sản xuất:', err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchOrderDetail();
  }, [editingOrderId, location.state, uniqueFactories]);

  const handleSelectPurchaseRequisition = async (reqObj) => {
    if (!reqObj) return;

    setLoadingDetail(true);
    try {
      const fullReq = await purchasingService.getRequisitionById(reqObj.id).catch(() => reqObj);
      const itemsList = (fullReq && fullReq.items) ? fullReq.items : [];

      const poCodeVal = reqObj.po_code || fullReq.po_code || '';
      const orderDateVal = (reqObj.order_date || fullReq.order_date) 
        ? (reqObj.order_date || fullReq.order_date).split('T')[0]
        : '';
      const deliveryDateVal = (reqObj.delivery_date || fullReq.delivery_date) 
        ? (reqObj.delivery_date || fullReq.delivery_date).split('T')[0]
        : '';

      setOrderForm(prev => ({
        ...prev,
        code: prev.code || poCodeVal,
        orderId: poCodeVal,
        priority: reqObj.priority || fullReq.priority || 'Bình thường',
        startDate: orderDateVal,
        endDate: deliveryDateVal,
        status: reqObj.status || fullReq.status || 'Đang sản xuất'
      }));

      const defaultFac = uniqueFactories[0] || 'NM1';
      const mappedProducts = itemsList.map((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const spare = Math.ceil(qty * 0.05);
        const code = it.item_code || `SKU-${idx + 1}`;
        return {
          id: it.id || idx + 1,
          productCode: code,
          productName: it.item_name || 'Mặt hàng mua',
          lineType: it.type || it.content || reqObj.supplier_name || 'Nội thất',
          factory: defaultFac,
          orderQty: qty,
          spareQty: spare,
          totalQty: qty + spare,
          unit: it.unit || 'Bộ',
          startDate: toISODate(orderDateVal) || new Date().toISOString().split('T')[0],
          endDate: toISODate(deliveryDateVal) || '',
          deliveryDate: toISODate(it.requested_delivery_date ? it.requested_delivery_date.split('T')[0] : deliveryDateVal) || '',
          drawingCode: `BV-${code}`
        };
      });

      const mappedBomParts = itemsList.flatMap((it, idx) => {
        const qty = Number(it.quantity) || 0;
        const code = it.item_code || `SKU-${idx + 1}`;
        const baseBom = generateBomForProduct(code, it.item_name, qty, idx + 1);
        return baseBom.map(b => {
          const pair = mapStagePairToFactory(b.stageFrom, b.stageTo, defaultFac, stageOptions);
          return { ...b, ...pair };
        });
      });

      setOrderProducts(mappedProducts);
      setProductDetails(mappedBomParts);

      if (mappedProducts.length > 0) {
        setSelectedProductCode(mappedProducts[0].productCode);
      }

      if (toast) toast('success', `Đã nạp ${mappedProducts.length} mặt hàng từ Đơn mua hàng ${poCodeVal}`);
    } catch (err) {
      console.warn('Lỗi nạp dữ liệu từ Purchase Requisition:', err);
    } finally {
      setLoadingDetail(false);
      setIsPoDropdownOpen(false);
    }
  };

  const handleStartDateChange = (newStartDate) => {
    setOrderForm(prev => {
      const updated = { ...prev, startDate: newStartDate };
      if (prev.endDate && newStartDate && prev.endDate < newStartDate) {
        updated.endDate = newStartDate;
        if (toast) toast('info', 'Đã tự động điều chỉnh Ngày hoàn thành dự kiến khớp với Ngày bắt đầu.');
      }
      return updated;
    });
  };

  const handleEndDateChange = (newEndDate) => {
    if (orderForm.startDate && newEndDate && newEndDate < orderForm.startDate) {
      if (toast) toast('warning', 'Ngày hoàn thành dự kiến không được nhỏ hơn Ngày bắt đầu!');
      return;
    }
    setOrderForm(prev => ({ ...prev, endDate: newEndDate }));
  };

  const handleSaveOrder = async () => {
    if (!orderForm.code && !orderForm.orderId) {
      if (toast) toast('warning', 'Vui lòng nhập Mã lệnh sản xuất hoặc Mã đơn hàng!');
      return;
    }

    if (orderForm.startDate && orderForm.endDate && orderForm.endDate < orderForm.startDate) {
      if (toast) toast('warning', 'Ngày hoàn thành dự kiến không được nhỏ hơn Ngày bắt đầu!');
      return;
    }

    const statusToOrderStatus = {
      'Đang sản xuất': 1,
      'Hoàn thành': 3,
      'Chờ sản xuất': 0
    };

    const productsDetails = orderProducts.map(p => {
      const targetFac = p.factory || uniqueFactories[0] || 'NM1';
      let childrenDetails = productDetails.filter(d => d.parentCode === p.productCode);
      if (childrenDetails.length === 0) {
        const generated = generateBomForProduct(p.productCode, p.productName, p.orderQty || 50);
        childrenDetails = generated.map(b => {
          const pair = mapStagePairToFactory(b.stageFrom, b.stageTo, targetFac, stageOptions);
          return { ...b, ...pair };
        });
      }

      const children = childrenDetails.map(d => {
        const parts = (d.quantity || '').toString().split('/');
        const planned = parseInt(parts[parts.length - 1] || '0', 10) || Number(p.orderQty) || 1;
        return {
          name: d.compName || d.type || 'Chi tiết',
          sku: d.compCode || `${p.productCode}-${d.id}`,
          quantity: planned,
          unit: d.unit || 'Cái',
          specification: [d.spec, d.material].filter(Boolean).join(' - '),
          input_stage: d.stageFrom || 'Định hình',
          output_stage: d.stageTo || 'Lắp ráp',
          description: d.note || '',
          children: []
        };
      });
      return {
        name: p.productName || p.productCode,
        sku: p.productCode,
        factory: targetFac,
        quantity: Number(p.totalQty) || Number(p.orderQty) || 1,
        bom_details: children
      };
    });

    try {
      setLoading(true);

      if (isEditMode && editingOrderId) {
        const startDateStr = toISODate(orderForm.startDate) || new Date().toISOString().split('T')[0];
        const endDateStr = toISODate(orderForm.endDate) || startDateStr;

        const updatePayload = {
          order_status: statusToOrderStatus[orderForm.status] ?? 1,
          is_priority: orderForm.priority === 'Cao' ? 1 : 0,
          estimated_date: endDateStr,
          note: orderForm.status,
          products_details: productsDetails
        };

        const updated = await api.put(`/orders/${Number(editingOrderId) || editingOrderId}`, updatePayload).catch(() => null);
        if (!updated) {
          setLoading(false);
          if (toast) toast('error', 'Không thể cập nhật Lệnh sản xuất!');
          return;
        }
        if (toast) toast('success', 'Đã cập nhật thông tin Lệnh sản xuất thành công!');
        navigate('/admin/production-orders');
        return;
      }

      const statusToPlanStatus = {
        'Đang sản xuất': 1,
        'Hoàn thành': 2,
        'Chờ sản xuất': 0
      };

      const startDateStr = toISODate(orderForm.startDate) || new Date().toISOString().split('T')[0];
      const endDateStr = toISODate(orderForm.endDate) || startDateStr;
      const planStartDate = new Date(startDateStr);

      const planPayload = {
        code: `KHSX-${orderForm.code || orderForm.orderId}`,
        name: `Lệnh sản xuất ${orderForm.code || orderForm.orderId}`,
        month: planStartDate.getMonth() + 1,
        year: planStartDate.getFullYear(),
        estimated_date: startDateStr,
        finished_date: endDateStr,
        status: statusToPlanStatus[orderForm.status] ?? 1
      };

      let planRes = await planService.createPlan(planPayload).catch(() => null);
      let planId = planRes && (planRes.id || planRes.plan_id);
      if (!planId) {
        const plansRes = await planService.getPlans().catch(() => null);
        if (plansRes && Array.isArray(plansRes) && plansRes.length > 0) {
          planId = plansRes[0].id;
        } else if (plansRes && plansRes.items && plansRes.items.length > 0) {
          planId = plansRes.items[0].id;
        }
      }
      if (!planId) {
        setLoading(false);
        if (toast) toast('error', 'Không thể tạo kế hoạch sản xuất!');
        return;
      }

      const orderPayload = {
        order_code: orderForm.code || orderForm.orderId,
        customer: 'Khách hàng',
        plan_id: planId,
        order_status: statusToOrderStatus[orderForm.status] ?? 1,
        is_priority: orderForm.priority === 'Cao' ? 1 : 0,
        estimated_date: endDateStr,
        note: orderForm.status,
        products_details: productsDetails
      };

      const savedOrder = await api.post('/orders/', orderPayload).catch(() => null);
      if (!savedOrder) {
        setLoading(false);
        if (toast) toast('error', 'Không thể lưu Lệnh sản xuất!');
        return;
      }

      if (toast) toast('success', 'Đã lưu Lệnh sản xuất mới thành công!');
      navigate('/admin/production-orders');
    } catch (err) {
      console.warn('Lỗi lưu Lệnh sản xuất:', err);
      if (toast) toast('error', 'Lưu Lệnh sản xuất thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const filteredPOList = useMemo(() => {
    const salesOnly = purchaseRequisitions.filter(po => {
      const typeStr = (po.order_type || po.type || '').toLowerCase();
      if (typeStr.includes('mua')) return false;
      return true;
    });

    if (!poSearch.trim()) return salesOnly.slice(0, 20);
    const term = poSearch.toLowerCase().trim();
    return salesOnly.filter(po =>
      String(po.po_code || '').toLowerCase().includes(term) ||
      String(po.supplier_name || '').toLowerCase().includes(term) ||
      String(po.customer || '').toLowerCase().includes(term) ||
      String(po.order_code || '').toLowerCase().includes(term) ||
      String(po.id || '').includes(term)
    ).slice(0, 20);
  }, [purchaseRequisitions, poSearch]);

  const currentProduct = useMemo(() => {
    return orderProducts.find(p => p.productCode === selectedProductCode) || orderProducts[0] || null;
  }, [orderProducts, selectedProductCode]);

  const currentFactory = useMemo(() => {
    return currentProduct?.factory || uniqueFactories[0] || 'NM1';
  }, [currentProduct, uniqueFactories]);

  const currentFactoryStages = useMemo(() => {
    return getStagesForFactory(currentFactory, stageOptions);
  }, [currentFactory, stageOptions]);

  const displayedProductDetails = useMemo(() => {
    if (!selectedProductCode) return productDetails;
    const filtered = productDetails.filter(det => det.parentCode === selectedProductCode);
    if (filtered.length > 0) return filtered;
    
    const targetProd = orderProducts.find(p => p.productCode === selectedProductCode);
    const prodIndex = orderProducts.findIndex(p => p.productCode === selectedProductCode);
    const pIdx = prodIndex >= 0 ? prodIndex + 1 : 1;
    const qtyVal = targetProd ? targetProd.orderQty : 50;
    const targetFac = targetProd?.factory || currentFactory;
    const baseBom = generateBomForProduct(selectedProductCode, targetProd?.productName, qtyVal, pIdx);
    return baseBom.map(b => {
      const pair = mapStagePairToFactory(b.stageFrom, b.stageTo, targetFac, stageOptions);
      return { ...b, ...pair };
    });
  }, [productDetails, selectedProductCode, orderProducts, currentFactory, stageOptions]);

  const handleUpdateDetStage = (detId, field, newValue) => {
    setProductDetails(prev => {
      const exists = prev.some(d => d.id === detId);
      if (exists) {
        return prev.map(d => (d.id === detId ? { ...d, [field]: newValue } : d));
      } else {
        const updatedList = displayedProductDetails.map(d => (d.id === detId ? { ...d, [field]: newValue } : d));
        return [...prev.filter(p => p.parentCode !== selectedProductCode), ...updatedList];
      }
    });
  };

  const dynamicSubStages = useMemo(() => {
    const pCode = selectedProductCode || (orderProducts[0] ? orderProducts[0].productCode : null);
    const prodObj = orderProducts.find(p => p.productCode === pCode);
    const pName = prodObj ? prodObj.productName : '';
    const codeUpper = (pCode || '').toUpperCase();
    const nameUpper = (pName || '').toUpperCase();

    const isTable = codeUpper.includes('TABLE') || nameUpper.includes('TABLE') || nameUpper.includes('BÀN') || nameUpper.includes('DESK');
    const isChair = codeUpper.includes('CHAIR') || nameUpper.includes('CHAIR') || nameUpper.includes('GHẾ') || nameUpper.includes('STOOL');
    const isBed = codeUpper.includes('BED') || nameUpper.includes('HEADBOARD') || nameUpper.includes('GIƯỜNG');

    if (activeStage === 'Tạo phôi') {
      return [{ id: 1, name: 'Xẻ phôi gỗ' }, { id: 2, name: 'Bào 4 mặt' }];
    } else if (activeStage === 'Định hình') {
      if (isTable) return [{ id: 1, name: 'Cắt mặt bàn CNC' }, { id: 2, name: 'Tiện chân bàn' }, { id: 3, name: 'Chạy diềm' }];
      if (isChair) return [{ id: 1, name: 'Uốn nan tựa' }, { id: 2, name: 'Vót nhọn chân ghế' }, { id: 3, name: 'Đánh mộng' }];
      if (isBed) return [{ id: 1, name: 'Cắt ván khung' }, { id: 2, name: 'Định hình vách' }, { id: 3, name: 'Cắt mút đệm' }];
      return [{ id: 1, name: 'Cắt ván CNC' }, { id: 2, name: 'Dán viền nẹp' }, { id: 3, name: 'Khoan chốt cam' }];
    } else if (activeStage === 'Lắp ráp') {
      if (isTable) return [{ id: 1, name: 'Lắp khung diềm bàn' }, { id: 2, name: 'Bắt ke liên kết chân' }];
      if (isChair) return [{ id: 1, name: 'Lắp khung ghế' }, { id: 2, name: 'Bọc nệm da' }];
      return [{ id: 1, name: 'Khoan chốt cam' }, { id: 2, name: 'Lắp cụm khung' }];
    } else if (activeStage === 'Sơn') {
      return [{ id: 1, name: 'Sơn lót PU 1' }, { id: 2, name: 'Chà nhám xả bả' }, { id: 3, name: 'Sơn bóng PU' }];
    } else if (activeStage === 'Đóng gói') {
      return [{ id: 1, name: 'Bọc màng PE chống trầy' }, { id: 2, name: 'Dán tem QR Barcode' }, { id: 3, name: 'Đóng thùng Carton' }];
    } else if (activeStage === 'Lưu kho') {
      return [{ id: 1, name: 'Kiểm tra QC thành phẩm' }, { id: 2, name: 'Nhập kho thành phẩm' }];
    }
    return [{ id: 1, name: 'Thực hiện công đoạn' }];
  }, [activeStage, selectedProductCode, orderProducts]);

  const routingDisplayItems = useMemo(() => {
    const pCode = selectedProductCode || (orderProducts[0] ? orderProducts[0].productCode : null);
    const targetProd = orderProducts.find(p => p.productCode === pCode);
    const pName = targetProd ? targetProd.productName : (pCode || 'Sản phẩm');
    const bomItems = displayedProductDetails || [];

    const todayStr = orderForm.startDate || new Date().toISOString().split('T')[0];
    const endStr = toISODate(orderForm.endDate) || '2026-08-15';

    if (activeStage === 'Tạo phôi') {
      const rawItems = bomItems.filter(i => (i.unit === 'm3' || (i.material || '').toLowerCase().includes('gỗ') || (i.compName || '').toLowerCase().includes('gỗ') || (i.compName || '').toLowerCase().includes('phôi')));
      if (rawItems.length > 0) {
        return rawItems.map((r, idx) => ({
          ...r,
          id: `route-${r.id || idx}`,
          startDate: todayStr,
          endDate: endStr,
          team: 'Tổ Tạo phôi',
          type: 'Phôi gỗ thô',
          stageFrom: 'Tạo phôi',
          stageTo: 'Định hình',
          status: r.status || 'Chờ sản xuất'
        }));
      }
      return [
        { id: 'raw-1', compCode: `${pCode || 'SKU'}-RAW-01`, compName: `Gỗ sồi xẻ phôi thô cho ${pName}`, quantity: '0/2', unit: 'm3', material: 'Gỗ Sồi (Oak)', spec: '30*150*1800', volume: 0.8, team: 'Tổ Tạo phôi', type: 'Phôi gỗ thô', stageFrom: 'Tạo phôi', stageTo: 'Định hình', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'raw-2', compCode: `${pCode || 'SKU'}-RAW-02`, compName: `Ván công nghiệp xẻ thanh cho ${pName}`, quantity: '0/5', unit: 'Tấm', material: 'MDF Chống ẩm', spec: '18*1220*2440', volume: 1.2, team: 'Tổ Tạo phôi', type: 'Ván thô', stageFrom: 'Tạo phôi', stageTo: 'Định hình', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' }
      ];
    }

    if (activeStage === 'Định hình') {
      const detailItems = bomItems.filter(i => !((i.compName || '').toLowerCase().includes('thùng') || (i.compName || '').toLowerCase().includes('pe')));
      return detailItems.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Định hình',
        type: r.type || 'Linh kiện gia công',
        stageFrom: 'Định hình',
        stageTo: 'Lắp ráp',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Lắp ráp') {
      const mainItems = bomItems.filter(i => (i.compName || '').toLowerCase().includes('mặt') || (i.compName || '').toLowerCase().includes('khung') || (i.compName || '').toLowerCase().includes('chân') || (i.compName || '').toLowerCase().includes('cánh'));
      const listToUse = mainItems.length > 0 ? mainItems : bomItems.slice(0, 4);
      return listToUse.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Lắp ráp',
        type: 'Cụm lắp ráp',
        stageFrom: 'Lắp ráp',
        stageTo: 'Sơn',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Sơn') {
      const mainStructure = bomItems.filter(i => (i.compName || '').toLowerCase().includes('mặt') || (i.compName || '').toLowerCase().includes('khung') || (i.compName || '').toLowerCase().includes('cánh'));
      const listToUse = mainStructure.length > 0 ? mainStructure.slice(0, 3) : bomItems.slice(0, 2);
      return listToUse.map((r, idx) => ({
        ...r,
        id: `route-${r.id || idx}`,
        startDate: todayStr,
        endDate: endStr,
        team: 'Tổ Sơn PU',
        type: 'Khung/Mặt hoàn thiện',
        stageFrom: 'Sơn',
        stageTo: 'Đóng gói',
        status: r.status || 'Chờ sản xuất'
      }));
    }

    if (activeStage === 'Đóng gói') {
      return [
        { id: 'pack-1', compCode: `PK-CARTON-${pCode || '01'}`, compName: `Thùng Carton in logo thương hiệu cho ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'Giấy sóng 5 lớp', spec: '600*800*1200', volume: 0.5, team: 'Tổ Đóng gói', type: 'Thùng đóng gói', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'pack-2', compCode: `PK-PE-${pCode || '02'}`, compName: `Mút xốp PE foam bảo vệ góc cho ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'EPE Foam 5mm', spec: 'Tiêu chuẩn', volume: 0.1, team: 'Tổ Đóng gói', type: 'Vật liệu bảo vệ', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' },
        { id: 'pack-3', compCode: `PK-LABEL-${pCode || '03'}`, compName: `Tem nhãn QR Barcode & Thẻ bảo hành ${pName}`, quantity: `0/${targetProd?.totalQty || 50}`, unit: 'Bộ', material: 'Decal bóc dán', spec: 'A5', volume: 0.01, team: 'Tổ Đóng gói', type: 'Nhãn tem QR', stageFrom: 'Đóng gói', stageTo: 'Lưu kho', startDate: todayStr, endDate: endStr, status: 'Chờ sản xuất' }
      ];
    }

    if (activeStage === 'Lưu kho') {
      return [
        {
          id: `finished-${pCode || '01'}`,
          compCode: pCode || 'SKU-001',
          compName: `${pName} (Sản phẩm hoàn chỉnh)`,
          quantity: `0/${targetProd?.totalQty || 50}`,
          unit: targetProd?.unit || 'Bộ',
          material: targetProd?.material || 'Gỗ Sồi + MDF',
          spec: targetProd?.spec || 'Hoàn chỉnh',
          volume: 1.0,
          team: 'Kho thành phẩm',
          type: 'Thành phẩm hoàn chỉnh',
          stageFrom: 'Kho thành phẩm',
          stageTo: 'Xuất hàng',
          startDate: todayStr,
          endDate: endStr,
          status: 'Hoàn thành'
        }
      ];
    }

    return bomItems;
  }, [activeStage, displayedProductDetails, selectedProductCode, orderProducts, orderForm]);

  const combinedScheduleRows = useMemo(() => {
    const customForCurrentStage = customScheduleRows.filter(r => r.stageFrom === activeStage);
    return [...routingDisplayItems, ...customForCurrentStage];
  }, [routingDisplayItems, customScheduleRows, activeStage]);

  const handleAddScheduleRow = () => {
    const newRow = {
      id: Date.now(),
      startDate: orderForm.startDate || new Date().toISOString().split('T')[0],
      endDate: toISODate(orderForm.endDate) || '',
      team: 'Tổ mới',
      type: 'Chi tiết mới',
      stageFrom: activeStage,
      stageTo: activeStage === 'Đóng gói' ? 'Lưu kho' : 'Công đoạn tiếp',
      compName: 'Dòng kế hoạch bổ sung',
      quantity: '0/10',
      unit: 'Cái',
      spec: '15*200*600',
      volume: 1,
      material: 'Gỗ Sồi',
      compCode: `ADV-${Date.now().toString().slice(-4)}`,
      status: 'Chờ sản xuất'
    };
    setCustomScheduleRows([...customScheduleRows, newRow]);
    if (toast) toast('success', 'Đã thêm dòng kế hoạch mới thành công!');
  };

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* KHUNG 1: Thông tin chung */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '18px 24px',
            boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#2D1A12' }}>
                Thông tin chung {orderForm.code ? `(${orderForm.code})` : ''}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Dropdown chọn Đơn bán hàng */}
                <div style={{ position: 'relative' }} ref={poDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsPoDropdownOpen(!isPoDropdownOpen)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#FAF6F0',
                      border: '1.5px solid #EADCC9',
                      borderRadius: '8px',
                      color: '#5D3B32',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <Plus size={16} /> Chọn đơn bán hàng (PO)
                    <ChevronDown size={14} style={{ transform: isPoDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {isPoDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      width: '380px',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #EADCC9',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(45, 26, 18, 0.12)',
                      zIndex: 100,
                      overflow: 'hidden'
                    }}>
                      <div style={{ padding: '10px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                        <input
                          type="text"
                          placeholder="Tìm theo Mã PO, Khách hàng..."
                          value={poSearch}
                          onChange={(e) => setPoSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 12px',
                            border: '1px solid #EADCC9',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredPOList.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.82rem' }}>
                            Không tìm thấy Đơn bán hàng phù hợp
                          </div>
                        ) : (
                          filteredPOList.map((po) => (
                            <div
                              key={po.id}
                              onClick={() => handleSelectPurchaseRequisition(po)}
                              style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid #F1F5F9',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                            >
                              <div style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.88rem' }}>
                                {po.po_code || po.order_code || `PO-${po.id}`}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                                <span>{po.supplier_name || po.customer || 'Khách hàng'}</span>
                                <span>{po.order_date ? po.order_date.split('T')[0] : ''}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={loading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#6D4C3D',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(109, 76, 61, 0.2)'
                  }}
                >
                  <Send size={16} /> {loading ? 'Đang lưu...' : (isEditMode ? 'Cập nhật Lệnh SX' : 'Lưu Lệnh sản xuất')}
                </button>
              </div>
            </div>

            {/* Grid Thông tin form */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Mã Lệnh SX <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập mã Lệnh SX..."
                  value={orderForm.code}
                  onChange={(e) => setOrderForm({ ...orderForm, code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Mã Đơn hàng
                </label>
                <input
                  type="text"
                  placeholder="Mã đơn hàng..."
                  value={orderForm.orderId}
                  onChange={(e) => setOrderForm({ ...orderForm, orderId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Mức độ ưu tiên
                </label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="Bình thường">Bình thường</option>
                  <option value="Cao">Cao</option>
                  <option value="Gấp">Gấp</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={orderForm.startDate}
                  max={orderForm.endDate || undefined}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Ngày hoàn thành dự kiến
                </label>
                <input
                  type="date"
                  value={orderForm.endDate}
                  min={orderForm.startDate || undefined}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#5D3B32', marginBottom: '6px' }}>
                  Trạng thái Lệnh SX
                </label>
                <select
                  value={orderForm.status}
                  onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="Đang sản xuất">Đang sản xuất</option>
                  <option value="Chờ sản xuất">Chờ sản xuất</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                </select>
              </div>
            </div>
          </div>

          {/* MAIN TABS BÊN DƯỚI THÔNG TIN CHUNG */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #EADCC9', paddingBottom: '2px' }}>
            <button
              onClick={() => setActiveMainTab('order_info')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                fontWeight: '800',
                fontSize: '0.92rem',
                cursor: 'pointer',
                color: activeMainTab === 'order_info' ? '#6D4C3D' : '#94A3B8',
                borderBottom: activeMainTab === 'order_info' ? '3px solid #6D4C3D' : 'none',
                marginBottom: '-3px'
              }}
            >
              Thông tin đơn hàng
            </button>
            <button
              onClick={() => setActiveMainTab('process_plan')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                fontWeight: '800',
                fontSize: '0.92rem',
                cursor: 'pointer',
                color: activeMainTab === 'process_plan' ? '#6D4C3D' : '#94A3B8',
                borderBottom: activeMainTab === 'process_plan' ? '3px solid #6D4C3D' : 'none',
                marginBottom: '-3px'
              }}
            >
              Quy trình - Kế hoạch
            </button>
          </div>

          {/* TAB 1: THÔNG TIN ĐƠN HÀNG */}
          {activeMainTab === 'order_info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* BẢNG 1: THÔNG TIN ĐƠN HÀNG */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #EADCC9',
                padding: '18px 24px',
                boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
              }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                  Bảng 1: Danh sách Sản phẩm thuộc Lệnh
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                        <th style={{ padding: '10px', textAlign: 'center', width: '40px' }}>STT</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Mã sản phẩm</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Tên sản phẩm</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Phân loại</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Nhà máy sản xuất</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Số lượng ĐH</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Số lượng dự phòng</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Tổng sản xuất</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Đơn vị</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Mã bản vẽ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderProducts.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                            Chưa có sản phẩm nào. Chọn "Chọn đơn bán hàng (PO)" ở trên để tự động nạp danh sách sản phẩm.
                          </td>
                        </tr>
                      ) : (
                        orderProducts.map((p, idx) => {
                          const isSelected = selectedProductCode === p.productCode;
                          return (
                            <tr
                              key={p.id || idx}
                              onClick={() => setSelectedProductCode(p.productCode)}
                              style={{
                                borderBottom: '1px solid #EADCC9',
                                backgroundColor: isSelected ? '#FAF6F0' : (idx % 2 === 1 ? '#FAF8F6' : '#FFFFFF'),
                                cursor: 'pointer'
                              }}
                            >
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{p.productCode}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '700', color: '#5D3B32' }}>{p.productName}</td>
                              <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.lineType}</td>
                              <td style={{ padding: '8px 10px' }} onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={p.factory || uniqueFactories[0] || 'NM1'}
                                  onChange={(e) => handleChangeProductFactory(p.productCode, e.target.value)}
                                  style={{
                                    padding: '4px 8px',
                                    border: '1px solid #EADCC9',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    backgroundColor: '#FFFFFF',
                                    color: '#5D3B32',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {uniqueFactories.map(fac => (
                                    <option key={fac} value={fac}>{fac}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700' }}>{p.orderQty}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{p.spareQty}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1E3A8A' }}>{p.totalQty}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.unit}</td>
                              <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.drawingCode}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BẢNG 2: CHI TIẾT SẢN PHẨM / BOM */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #EADCC9',
                padding: '18px 24px',
                boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                    Bảng 2: Chi tiết Linh kiện BOM {selectedProductCode ? `(${selectedProductCode})` : ''}
                  </h4>
                  {selectedProductCode && (
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '4px 12px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                      Nhà máy chọn: {currentFactory}
                    </span>
                  )}
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                        <th style={{ padding: '10px', textAlign: 'center', width: '40px' }}>STT</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Loại linh kiện</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Công đoạn giao</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Công đoạn nhận</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Mã linh kiện</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Tên linh kiện</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Số lượng</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Đơn vị</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Vật liệu</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Quy cách (mm)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Khối lượng (m3)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedProductDetails.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                            Chọn một sản phẩm ở Bảng 1 ở trên để xem chi tiết linh kiện BOM.
                          </td>
                        </tr>
                      ) : (
                        displayedProductDetails.map((det, idx) => (
                          <tr key={det.id ? `${selectedProductCode}-${det.id}-${idx}` : `row-${idx}`} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF8F6' : '#FFFFFF' }}>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>{det.stt || det.tree_stt || `${(orderProducts.findIndex(p => p.productCode === selectedProductCode) >= 0 ? orderProducts.findIndex(p => p.productCode === selectedProductCode) + 1 : 1)}.${idx + 1}`}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '700', color: '#5D3B32' }}>{det.type}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <select
                                value={det.stageFrom}
                                onChange={(e) => handleUpdateDetStage(det.id, 'stageFrom', e.target.value)}
                                style={{ padding: '3px 6px', border: '1px solid #EADCC9', borderRadius: '4px', fontSize: '0.8rem' }}
                              >
                                {currentFactoryStages.map(stg => (
                                  <option key={`from-${stg}`} value={stg}>{stg}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <select
                                value={det.stageTo}
                                onChange={(e) => handleUpdateDetStage(det.id, 'stageTo', e.target.value)}
                                style={{ padding: '3px 6px', border: '1px solid #EADCC9', borderRadius: '4px', fontSize: '0.8rem' }}
                              >
                                {currentFactoryStages
                                  .filter(stg => stg !== det.stageFrom)
                                  .map(stg => (
                                    <option key={`to-${stg}`} value={stg}>{stg}</option>
                                  ))}
                              </select>
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{det.compCode}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600' }}>{det.compName}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800' }}>{det.quantity}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{det.unit}</td>
                            <td style={{ padding: '8px 10px', color: '#64748B' }}>{det.material}</td>
                            <td style={{ padding: '8px 10px', color: '#64748B' }}>{det.spec}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{det.volume}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUY TRÌNH - KẾ HOẠCH */}
          {activeMainTab === 'process_plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* KHUNG 1: QUY TRÌNH SẢN XUẤT */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #EADCC9',
                padding: '20px 24px',
                boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
              }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12' }}>
                  Quy trình sản xuất
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }}>
                  {mainStages.map((stg, idx) => {
                    const isActive = activeStage === stg;
                    return (
                      <React.Fragment key={stg}>
                        <button
                          type="button"
                          onClick={() => setActiveStage(stg)}
                          style={{
                            padding: '10px 18px',
                            backgroundColor: isActive ? '#A3E635' : '#FFFFFF',
                            border: `2px solid ${isActive ? '#65A30D' : '#EADCC9'}`,
                            borderRadius: '8px',
                            color: isActive ? '#1A2E05' : '#5D3B32',
                            fontWeight: '800',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: isActive ? '0 4px 12px rgba(163, 230, 53, 0.4)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {stg}
                        </button>
                        {idx < mainStages.length - 1 && (
                          <ArrowRight size={18} style={{ color: '#94A3B8', flexShrink: 0 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div style={{ border: '2px dashed #EADCC9', borderRadius: '10px', padding: '16px 20px', backgroundColor: '#FAF8F6' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#7B5233', marginBottom: '10px' }}>
                    Tổ máy & Công đoạn con thuộc: <strong style={{ color: '#1A2E05' }}>{activeStage}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {dynamicSubStages.map((sub, sIdx, arr) => (
                      <React.Fragment key={sub.id}>
                        <div style={{
                          padding: '8px 18px',
                          borderRadius: '9999px',
                          backgroundColor: '#7DD3FC',
                          border: '1.5px solid #0284C7',
                          color: '#0F172A',
                          fontWeight: '800',
                          fontSize: '0.9rem'
                        }}>
                          {sub.name}
                        </div>
                        {sIdx < arr.length - 1 && (
                          <ArrowRight size={20} style={{ color: '#475569' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* KHUNG 2: KẾ HOẠCH THỰC HIỆN */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #EADCC9',
                padding: '20px 24px',
                boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Kế hoạch thực hiện</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                      Công đoạn: {activeStage}
                    </span>
                    {selectedProductCode && (
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '3px 10px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                        SKU: {selectedProductCode}
                      </span>
                    )}
                  </h4>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                        <th style={{ padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày bắt đầu (dự kiến)</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày kết thúc (dự kiến)</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tổ</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Loại</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên thành phẩm</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Quy cách (mm)</th>
                        <th style={{ padding: '9px 10px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Khối lượng (m3)</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã thành phẩm</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: '700' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedScheduleRows.length === 0 ? (
                        <tr>
                          <td colSpan={15} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                            Không có dữ liệu linh kiện cho công đoạn {activeStage}. Nhấp nút "+ Thêm mới" bên dưới để bổ sung.
                          </td>
                        </tr>
                      ) : (
                        combinedScheduleRows.map((r, idx) => (
                          <tr key={r.id ? `${r.compCode || 'sched'}-${r.id}-${idx}` : `sched-${idx}`} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>{r.stt || r.tree_stt || `${(orderProducts.findIndex(p => p.productCode === selectedProductCode) >= 0 ? orderProducts.findIndex(p => p.productCode === selectedProductCode) + 1 : 1)}.${idx + 1}`}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.startDate || '---'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.endDate || '---'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.team || '---'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.type || '---'}</td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageFrom || '---'}</td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageTo || '---'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600', color: '#334155' }}>{r.compName || '---'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1F2937' }}>{r.quantity || '0/0'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#334155' }}>{r.unit || '---'}</td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{r.spec || '---'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>{r.volume !== undefined ? r.volume : '0'}</td>
                            <td style={{ padding: '8px 10px', color: '#334155' }}>{r.material || '---'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '800', color: '#2D1A12' }}>{r.compCode || '---'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 9px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                backgroundColor: r.status === 'Hoàn thành' ? '#ECFDF5' : '#FFFBEB',
                                color: r.status === 'Hoàn thành' ? '#10B981' : '#D97706',
                                border: `1px solid ${r.status === 'Hoàn thành' ? '#A7F3D0' : '#FDE68A'}`
                              }}>
                                {r.status || 'Chờ sản xuất'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddScheduleRow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#FAF6F0',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    color: '#5D3B32',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EADCC9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                >
                  <Plus size={15} /> Thêm mới
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProductionOrderCreateView;
