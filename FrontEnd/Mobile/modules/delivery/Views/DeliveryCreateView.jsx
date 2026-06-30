import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import FormInput from '@mobile/Shared/Views/components/form/FormInput'
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect'
import FormSearchSelect from '@mobile/Shared/Views/components/form/FormSearchSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import { useDeliveryController } from '@modules/delivery/Controllers/deliveryController'
import useAuthStore from '@modules/auth/Models/authModel'
import { usePlanController } from '@modules/production/Controllers/planController'
import { Camera, QrCode, Trash2, X, Check, RotateCcw, AlertCircle, Info, CheckCircle, ChevronDown, Save, ArrowLeft, Truck, Package, ScanLine, Eye } from 'lucide-react'
import QRDisplayModal from '@mobile/Shared/Views/components/media/QRDisplayModal'
import PalletCardModal from '@modules/delivery/Views/components/PalletCardModal'
import PlanDetailsModal from '@modules/delivery/Views/components/PlanDetailsModal'

// [NEW] Thành phần nhập độ ẩm nhỏ gọn, nút nằm trong ô
const MoistureStepper = ({ label, value, onChange, placeholder }) => {
  const adjust = (delta) => {
    const current = parseFloat(value) || 0;
    let next = current + delta;
    if (next < 0) next = 0;
    if (next > 100) next = 100;
    onChange((Math.round(next * 10) / 10).toString());
  };

  const btnStyle = {
    width: 'clamp(24px, 7.5vw, 36px)',
    height: 'clamp(24px, 7.5vw, 36px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    border: 'none',
    color: '#334155',
    fontSize: 'clamp(0.9rem, 3.5vw, 1.2rem)',
    fontWeight: 'bold',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.2s'
  };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {label && (
        <label style={{ 
          fontSize: '0.8rem', 
          fontWeight: '800', 
          color: '#475569', 
          marginBottom: '2px', 
          minHeight: '24px', 
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%'
        }}>
          {label}
        </label>
      )}
      <div style={{ 
        display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', 
        border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', 
        height: 'clamp(30px, 8.5vw, 36px)', minWidth: 0
      }}>
        <button 
          type="button" 
          style={btnStyle} 
          onClick={() => adjust(-0.1)}
        >-</button>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            const val = e.target.value;
            if (val === '') { onChange(''); return; }
            if (/^\d*\.?\d*$/.test(val)) {
              if (parseFloat(val) <= 100) onChange(val);
            }
          }}
          style={{
            flex: 1, width: '100%', height: '100%', border: 'none', textAlign: 'center', 
            fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)', fontWeight: '800', color: '#0f172a', outline: 'none', padding: 0,
            backgroundColor: 'transparent', minWidth: 0
          }}
        />
        <button 
          type="button" 
          style={btnStyle} 
          onClick={() => adjust(0.1)}
        >+</button>
      </div>
    </div>
  );
};

/**
 * MH2.1 - Tạo phiếu giao
 */
const DeliveryCreate = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, permissions } = useAuthStore()

  // Lấy ID kế hoạch được truyền sang từ màn hình trước
  const initialPlanId = location.state?.planId || ''
  const backupQrCode = location.state?.backupQrCode || null // [NEW] Nhận mã dự phòng
  const editDeliveryId = location.state?.editDeliveryId || null // [NEW] ID phiếu đang chỉnh sửa
  const editData = location.state?.editData || null // [NEW] Dữ liệu phiếu đang chỉnh sửa
  const isEditMode = !!editDeliveryId

  const userRoleStr = [
    user?.permission_description,
    user?.permission_name,
    user?.role_description,
    user?.role_name,
    user?.full_name,
    user?.username
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');
  const isAdmin = userRoleStr.includes('admin') || userRoleStr.includes('it') || userRoleStr.includes('bgd');

  const userPerm = permissions?.['mobile_delivery-create'];
  const hasActionPermission = isAdmin || (
    userPerm && userPerm !== 'none' && 
    userPerm.split(',').map(p => p.trim()).includes(isEditMode ? 'edit' : 'create')
  );

  const { plans, fetchPlans, fetchDeliveriesByPlan, fetchPlanDetail } = usePlanController()
  const { createOrUpdateDelivery, fetchPartProducts, fetchInspectionsByPlan, fetchNextDeliveryId, isSubmitting } = useDeliveryController()
  const [deliveries, setDeliveries] = useState([])

  // State
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId)
  const [activeTab, setActiveTab] = useState('handover')
  const [selectedPartKey, setSelectedPartKey] = useState('')
  const [selectedSpecification, setSelectedSpecification] = useState('') // [NEW] Quy cách
  const [inspections, setInspections] = useState([])
  const [totalHandover, setTotalHandover] = useState('')
  const [photos, setPhotos] = useState([])
  const [residual, setResidual] = useState('0')
  const [receivingStage, setReceivingStage] = useState('')
  const [note, setNote] = useState('')
  const [moistureMin, setMoistureMin] = useState('8') // Mặc định 8
  const [moistureMax, setMoistureMax] = useState('12') // Mặc định 12
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' })
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [showPalletModal, setShowPalletModal] = useState(false)
  const [palletData, setPalletData] = useState(null)
  const [predictedId, setPredictedId] = useState(null)
  const [partProducts, setPartProducts] = useState([])
  const [selectedOrderCodes, setSelectedOrderCodes] = useState([])
  const [aggregatedParts, setAggregatedParts] = useState([])
  const fileInputRef = useRef(null)

  const userStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''

  useEffect(() => {
    fetchPlans(userStage)
  }, [fetchPlans, userStage])

  useEffect(() => {
    const loadData = async () => {
      if (!selectedPlanId) return
      try {
        const stageParam = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''

        const fetchStage = stageParam.toLowerCase().includes('đóng gói') ? '' : stageParam;

        // Gọi song song các API để tăng tốc độ load
        const [deliveryList, planResp] = await Promise.all([
          fetchDeliveriesByPlan(selectedPlanId),
          fetchPlanDetail(selectedPlanId, fetchStage)
        ])

        setDeliveries(deliveryList || [])
        
        if (stageParam.toLowerCase().includes('đóng gói')) {
           const poParts = [];
           const userStageNorm = stageParam.toLowerCase().trim();

           (planResp?.orders || []).forEach(o => {
               (o.products || []).forEach(p => {
                   const checkTree = (nodes) => {
                       if (!nodes || !Array.isArray(nodes)) return false;
                       for (let n of nodes) {
                           const inS = (n.input_stage || '').toLowerCase().trim();
                           const outS = (n.output_stage || '').toLowerCase().trim();
                           if (inS === userStageNorm || outS === userStageNorm) return true;
                           if (inS.includes(userStageNorm) || outS.includes(userStageNorm)) return true;
                           if (checkTree(n.parts)) return true;
                       }
                       return false;
                   };
                   
                    if (!userStageNorm || userStageNorm.includes('đóng gói') || userStageNorm.includes('đg') || checkTree(p.bom_details)) {
                       poParts.push({
                          ...p,
                          name: p.name || p.sku,
                          displayName: `[${o.name}] ${p.name || p.sku}`,
                          output_stage: 'Kho thành phẩm',
                          input_stage: stageParam,
                          order_code: o.name,
                          order_id: o.id,
                          finished_quantity: p.finished_quantity || 0
                       });
                   }
               });
           });
           setAggregatedParts(poParts);
        } else {
           setAggregatedParts(planResp?.bom_details?.handover || [])
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu chi tiết:", err)
      }
    }
    loadData()
  }, [selectedPlanId, fetchDeliveriesByPlan, user, fetchPlanDetail])

  // [MỚI] Pre-fill form khi ở chế độ chỉnh sửa
  useEffect(() => {
    if (!isEditMode || !editData) return
    // Chờ cho aggregatedParts được load xong rồi mới set
    if (aggregatedParts.length > 0 && editData.part_name) {
      // Tìm part key khớp với tên chi tiết cũ
      const matchKey = aggregatedParts.find(p => {
        const label = (p.displayName || p.name || '').trim();
        return label === editData.part_name;
      });
      if (matchKey) {
        setSelectedPartKey((matchKey.displayName || matchKey.name || '').trim());
      } else {
        setSelectedPartKey(editData.part_name);
      }
    }
    if (editData.specification) setSelectedSpecification(editData.specification)
    if (editData.quantity_total) setTotalHandover(editData.quantity_total.toString())
    if (editData.residual) setResidual(editData.residual.toString())
    if (editData.note) setNote(editData.note)
    if (editData.receiving_stage) setReceivingStage(editData.receiving_stage)
    if (editData.moisture_min != null) setMoistureMin(editData.moisture_min.toString())
    if (editData.moisture_max != null) setMoistureMax(editData.moisture_max.toString())
  }, [isEditMode, editData, aggregatedParts])

  const currentPlan = plans?.find(p => (p.id?.toString() || '') === selectedPlanId)

  const partOptions = useMemo(() => {
    const uniqueMap = new Map();
    aggregatedParts.forEach(p => {
      const rawLabel = p.displayName || p.name || '';
      const label = rawLabel.trim(); // Loại bỏ khoảng trắng dư thừa
      const key = label.toLowerCase(); // Chuẩn hóa để so sánh

      if (label && !uniqueMap.has(key)) {
        uniqueMap.set(key, { label, value: label });
      }
    });
    return Array.from(uniqueMap.values());
  }, [aggregatedParts])

  useEffect(() => {
    if (partOptions.length > 0 && !selectedPartKey) {
      setSelectedPartKey(partOptions[0].value)
    }
  }, [partOptions, selectedPartKey])

  // [NEW] Tạo danh sách Quy cách dựa trên Chi tiết đã chọn
  const specOptions = useMemo(() => {
    if (!selectedPartKey) return [];
    const uniqueMap = new Map();
    aggregatedParts
      .filter(p => (p.displayName || p.name || '').trim().toLowerCase() === selectedPartKey.toLowerCase())
      .forEach(p => {
        const spec = p.specification || 'Không có';
        const key = spec.toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, { label: spec, value: spec });
        }
      });
    return Array.from(uniqueMap.values());
  }, [aggregatedParts, selectedPartKey]);

  useEffect(() => {
    if (specOptions.length > 0) {
      if (!specOptions.find(o => o.value === selectedSpecification)) {
        setSelectedSpecification(specOptions[0].value);
      }
    } else {
      setSelectedSpecification('');
    }
  }, [specOptions, selectedSpecification]);

  // Tìm chi tiết dựa trên tên VÀ quy cách
  const selectedPart = useMemo(() => {
    if (!selectedPartKey) return null;
    const parts = aggregatedParts.filter(p => (p.displayName || p.name || '').trim().toLowerCase() === selectedPartKey.toLowerCase());
    if (selectedSpecification) {
       const matched = parts.find(p => (p.specification || 'Không có') === selectedSpecification);
       if (matched) return matched;
    }
    return parts[0] || null;
  }, [aggregatedParts, selectedPartKey, selectedSpecification])

  // Gộp các sản phẩm có trùng PO (order_code) và cộng dồn số lượng còn lại
  const groupedPartProducts = useMemo(() => {
    const groups = {};
    partProducts.forEach(p => {
      const code = p.order_code || 'Chung';
      if (!groups[code]) {
        groups[code] = {
          order_code: code,
          customer: p.customer || '',
          prod_sku: p.prod_sku || '',
          part_qty_needed: 0,
          delivered: 0,
          order_ids: []
        };
      }
      groups[code].part_qty_needed += (p.part_qty_needed || 0);
      groups[code].delivered += (p.delivered || 0);
      if (p.order_id) {
        groups[code].order_ids.push(p.order_id.toString());
      }
    });
    return Object.values(groups);
  }, [partProducts]);

  // Danh sách ID đơn hàng thực tế gửi lên Backend
  const orderIdsToSend = useMemo(() => {
    const ids = [];
    groupedPartProducts.forEach(g => {
      if (selectedOrderCodes.includes(g.order_code)) {
        ids.push(...g.order_ids);
      }
    });
    return ids;
  }, [groupedPartProducts, selectedOrderCodes]);

  // Tự động tính toán số dư = Tổng giao - tổng số lượng còn lại của các đơn hàng đã chọn
  useEffect(() => {
    const totalQty = parseInt(totalHandover) || 0;
    const totalRemainingForSelected = groupedPartProducts
      .filter(g => selectedOrderCodes.includes(g.order_code))
      .reduce((sum, g) => sum + Math.max(0, (g.part_qty_needed || 0) - (g.delivered || 0)), 0);
    
    const calculatedResidual = Math.max(0, totalQty - totalRemainingForSelected);
    setResidual(calculatedResidual.toString());
  }, [totalHandover, selectedOrderCodes, groupedPartProducts]);

  // Preview pallet từ dữ liệu form hiện tại (trước khi submit)
  const previewPalletData = {
    ...(palletData || {}),
    id: palletData?.id || predictedId,
    plan_name: currentPlan?.name || '',
    part_name: selectedPart?.displayName || selectedPart?.name || selectedPartKey || '',
    specification: selectedSpecification || '',
    quantity: parseInt(totalHandover) || 0,
    residual: parseInt(residual) || 0,
    delivery_stage: user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || '',
    receiving_stage: receivingStage || '',
    note: note || '',
    moisture_min: moistureMin || '',
    moisture_max: moistureMax || '',
    qc_status: inspections.length > 0 ? 'Đã kiểm tra' : 'Chưa test',
    user_name: user?.name || user?.username || '',
    selected_order_ids: orderIdsToSend
  }

  const isFirstEditLoad = useRef(isEditMode)

  // Mở xem thẻ Pallet
  const handleOpenPallet = async () => {
    setShowPalletModal(true)
    try {
      // Lấy ID dự kiến
      const nextId = await fetchNextDeliveryId()
      if (nextId) setPredictedId(nextId)
    } catch (e) {
      console.error('Lỗi fetch pallet next-id:', e)
    }
  }

  useEffect(() => {
    if (!selectedPartKey || !selectedPart) {
      setReceivingStage('')
      return
    }
    const targetStage = selectedPart.output_stage || ''
    if (targetStage && targetStage !== 'N/A') {
      setReceivingStage(targetStage)
    } else {
      setReceivingStage('')
    }
  }, [selectedPartKey, selectedPart])

  // Tự động tải danh sách đơn hàng/sản phẩm (part-products)
  useEffect(() => {
    const loadPartProducts = async () => {
      if (!selectedPlanId || !selectedPartKey) {
        setPartProducts([])
        setSelectedOrderCodes([])
        return
      }
      try {
        const stageParamActive = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || '';

        // Nếu là Đóng gói, tạo mock partProducts từ dữ liệu PO đã có sẵn
        if (stageParamActive.toLowerCase().includes('đóng gói') && selectedPart) {
          const mockData = [{
             order_code: selectedPart.order_code || 'Chung',
             order_id: selectedPart.order_id || null,
             part_qty_needed: selectedPart.quantity || 0,
             delivered: selectedPart.finished_quantity || 0
          }];
          setPartProducts(mockData);
          if (isEditMode && isFirstEditLoad.current && editData?.details) {
            const prefilled = editData.details.map(d => d.order_code).filter(Boolean);
            setSelectedOrderCodes(prefilled);
            isFirstEditLoad.current = false;
          } else {
            setSelectedOrderCodes([]);
          }
          return;
        }

        const partName = selectedPart?.name || selectedPartKey
        const spec = selectedSpecification !== 'Không có' ? selectedSpecification : ''
        const stageParam = selectedPart?.input_stage || stageParamActive

        const data = await fetchPartProducts(selectedPlanId, partName, spec, stageParam)
        setPartProducts(data)

        // Chỉ chọn nếu là Edit Mode và lần đầu load, còn lại để trống không tự chọn mặc định nữa
        if (isEditMode && isFirstEditLoad.current && editData?.details) {
          const prefilled = editData.details.map(d => d.order_code).filter(Boolean);
          setSelectedOrderCodes(prefilled);
          isFirstEditLoad.current = false;
        } else {
          setSelectedOrderCodes([])
        }
      } catch (e) {
        console.error('Lỗi fetch part products:', e)
        setPartProducts([])
        setSelectedOrderCodes([])
      }
    }
    loadPartProducts()
  }, [selectedPlanId, selectedPartKey, selectedSpecification, selectedPart, user, fetchPartProducts])

  // [NEW] Kiểm tra xem chi tiết và quy cách đã được KT đầu vào chưa
  useEffect(() => {
    const checkInspection = async () => {
      if (!selectedPlanId || !selectedPartKey) {
        setInspections([])
        return
      }
      try {
        const stageParam = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''
        // Lấy tất cả KT của KHSX này theo công đoạn
        const allInsps = await fetchInspectionsByPlan(selectedPlanId, stageParam)
        
        // Lọc đúng chi tiết và quy cách đang chọn
        const partInsps = allInsps.filter(i => {
          const nameMatches = (i.part_name || '').trim().toLowerCase() === selectedPartKey.trim().toLowerCase()
          const spec1 = (i.specification || 'Không có').trim().toLowerCase()
          const spec2 = (selectedSpecification || 'Không có').trim().toLowerCase()
          return nameMatches && spec1 === spec2
        })
        setInspections(partInsps)
      } catch (err) {
        console.error("Lỗi khi kiểm tra dữ liệu KT:", err)
        setInspections([])
      }
    }
    checkInspection()
  }, [selectedPlanId, selectedPartKey, selectedSpecification, user, fetchInspectionsByPlan])

  const handleAddPhoto = () => {
    if (photos.length < 3 && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && photos.length < 3) {
      const newPhoto = {
        id: Date.now(),
        file: file,
        url: URL.createObjectURL(file)
      }
      setPhotos([...photos, newPhoto])
    }
    if (e.target) e.target.value = null
  }

  const handleRemovePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id))
  }

  const handleConfirm = () => {
    if (!selectedPartKey || !totalHandover) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn chi tiết bàn giao và nhập tổng số lượng giao!'
      })
      return
    }

    if (!selectedOrderCodes || selectedOrderCodes.length === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn ít nhất một Container (Cont) giao!'
      })
      return
    }

    // [NEW] Ràng buộc: Phải có kết quả kiểm tra đầu vào mới được tạo phiếu
    if (inspections.length === 0) {
      const specText = selectedSpecification ? ` với quy cách "${selectedSpecification}"` : '';
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Chưa kiểm tra đầu vào',
        message: `Chi tiết "${selectedPartKey}"${specText} chưa thực hiện kiểm tra đầu vào tại công đoạn này. Vui lòng thực hiện kiểm tra chất lượng đầu vào trước khi bàn giao!`
      })
      return
    }

    // Ràng buộc độ ẩm: Max > Min
    const minVal = parseFloat(moistureMin) || 0;
    const maxVal = parseFloat(moistureMax) || 0;
    if (maxVal <= minVal && (moistureMin || moistureMax)) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Lỗi độ ẩm',
        message: 'Độ ẩm Tối đa (Max) phải lớn hơn Độ ẩm Tối thiểu (Min)!'
      });
      return;
    }

    setShowConfirmModal(true)
  }

  const executeSubmit = async () => {
    try {
      setShowConfirmModal(false)

      const payload = {
        plan_id: selectedPlanId,
        receiving_stage: receivingStage,
        note: note,
        user_id: user?.id || 1,
        quantity: parseInt(totalHandover) || 0,
        residual: parseInt(residual) || 0,
        part_name: selectedPart?.displayName || selectedPart?.name || 'Chi tiết không tên',
        specification: selectedSpecification,
        delivery_stage: user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'Chưa xác định',
        status: 'Chờ Nhận Hàng',
        backup_qr: backupQrCode,
        moisture_min: moistureMin,
        moisture_max: moistureMax,
        order_ids: orderIdsToSend && orderIdsToSend.length > 0 ? orderIdsToSend.join(',') : null
      }

      const resData = await createOrUpdateDelivery(payload, isEditMode, editDeliveryId, photos)

      setQrData({
        ...resData,
        plan_name: currentPlan?.name || '',
        part_name: selectedPart?.displayName || selectedPart?.name || '',
        quantity: parseInt(totalHandover) || 0,
        residual: parseInt(residual) || 0
      })

      // Chuẩn bị dữ liệu Thẻ Pallet
      setPalletData({
        ...resData,
        plan_name: currentPlan?.name || '',
        part_name: selectedPart?.displayName || selectedPart?.name || '',
        specification: selectedSpecification || '',
        quantity: parseInt(totalHandover) || 0,
        residual: parseInt(residual) || 0,
        delivery_stage: user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || '',
        receiving_stage: receivingStage || '',
        note: note || '',
        user_name: user?.name || user?.username || '',
        selected_order_ids: orderIdsToSend
      })

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: isEditMode ? 'Đã cập nhật phiếu bàn giao thành công!' : 'Đã tạo phiếu bàn giao thành công và lưu vào hệ thống!'
      })

    } catch (error) {
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể lưu phiếu bàn giao: ' + error.message
      })
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b' }

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle={isEditMode ? `MB2.1 | Chỉnh sửa phiếu DLV-${editDeliveryId}` : 'MB2.1 | Tạo phiếu giao'} />

      <div style={{ padding: '0px', backgroundColor: 'var(--bg-cream)', flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div id="delivery-create-tabs" style={{ backgroundColor: 'var(--bg-cream)', padding: '0 16px', paddingTop: '10px' }}>
          <Tabs
            tabs={[
              { id: 'handover', label: 'Thông tin bàn giao', icon: Truck },
              { id: 'quality', label: 'Thông tin chất lượng', icon: Package }
            ]}
            activeTab={activeTab}
            onTabChange={(id) => {
              const uRole = (user?.role_name || '').toLowerCase();
              const uStage = (user?.activeStageDescription || user?.activeStageName || user?.stage_name || user?.stage_description || '').toLowerCase();
              const isProduction = uRole.includes('sản xuất') || uStage.includes('sản xuất') || uStage.includes('định hình') || uStage.includes('lắp ráp');

              if (id === 'quality' && isProduction) {
                setMessageModal({
                  isOpen: true,
                  type: 'info',
                  title: 'Hạn chế truy cập',
                  message: 'Công đoạn của bạn chỉ được phép nhập Thông tin bàn giao. Thông tin chất lượng sẽ do bộ phận QC/Nhận hàng xử lý.'
                });
                return;
              }
              setActiveTab(id);
            }}
          />
        </div>

        {backupQrCode && (
            <div style={{ backgroundColor: '#fffbe1', padding: '10px 16px', color: '#b45309', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScanLine size={18} /> Đang sử dụng mã QR Dự Phòng: {backupQrCode}
            </div>
        )}

        {!initialPlanId && (
            <div style={{ padding: '16px', paddingBottom: '0', backgroundColor: 'var(--bg-cream)' }}>
                <FormSearchSelect
                    label="Kế hoạch sản xuất"
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    options={plans.map(p => ({ label: p.name, value: p.id.toString() }))}
                />
            </div>
        )}

        <div style={{ padding: '12px var(--spacing-md) 100px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: 'var(--spacing-lg) var(--spacing-md)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Thông tin giao</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedPlanId && (
                  <button
                    id="delivery-khsx-btn"
                    onClick={() => setShowPlanModal(true)}
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'var(--primary-color)', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '7px 12px',
                      fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    <Info size={15} /> Xem KHSX
                  </button>
                )}
                {selectedPartKey && (
                  <button
                    id="delivery-pallet-btn"
                    onClick={handleOpenPallet}
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#3d2b1f', color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '7px 12px',
                      fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    <Eye size={15} /> Thẻ Pallet
                  </button>
                )}
              </div>
            </div>

            <div id="delivery-stages-group" style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <FormInput
                label="Công đoạn giao"
                value={user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''}
                readOnly={true}
              />
              <FormInput
                label="Công đoạn nhận"
                value={receivingStage || 'Chưa xác định'}
                readOnly={true}
              />
            </div>

            {/* Row 1: Chọn chi tiết & Quy cách */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div id="delivery-part-select" style={{ flex: 1.5, minWidth: 0 }}>
                <FormSearchSelect
                  label="Chọn chi tiết"
                  value={selectedPartKey}
                  onChange={e => setSelectedPartKey(e.target.value)}
                  options={partOptions}
                  readOnly={false}
                />
              </div>
              <div id="delivery-spec-select" style={{ flex: 1, minWidth: 0 }}>
                <FormSearchSelect
                  label="Quy cách"
                  value={selectedSpecification}
                  onChange={e => setSelectedSpecification(e.target.value)}
                  options={specOptions}
                  readOnly={false}
                  alignMenu="right"
                />
              </div>
            </div>

            {/* Row 2: Cont & Tổng giao */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'flex-end' }}>
              <div id="delivery-order-select" style={{ flex: 1.5, minWidth: 0 }}>
                {groupedPartProducts && groupedPartProducts.length > 0 ? (
                  <FormMultiSearchSelect
                    label="Đơn hàng giao (Cont)"
                    values={selectedOrderCodes}
                    onChange={(newVals) => setSelectedOrderCodes(newVals)}
                    options={groupedPartProducts.map(p => {
                      const remaining = Math.max(0, (p.part_qty_needed || 0) - (p.delivered || 0));
                      return {
                        label: `Cont: ${p.order_code || 'Chung'} (Còn: ${remaining?.toLocaleString('vi-VN')})`,
                        value: p.order_code || '',
                        remaining: remaining
                      };
                    }).filter(p => p.remaining > 0)}
                    placeholder="Chọn Cont giao..."
                    required={true}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <label style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: '800', 
                      color: '#475569', 
                      marginBottom: '4px',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%'
                    }}>
                      Đơn hàng giao (Cont)
                    </label>
                    <div style={{ height: '42px', backgroundColor: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.9rem', color: '#64748b', minWidth: 0 }}>
                      Không có Cont
                    </div>
                  </div>
                )}
              </div>
              <div id="delivery-qty-input" style={{ flex: 1, minWidth: 0 }}>
                <FormInput
                  label="Tổng giao"
                  type="number"
                  value={totalHandover}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');

                    if (val && parseInt(val) > 20000) {
                      setMessageModal({
                        isOpen: true,
                        type: 'warning',
                        title: 'Giới hạn số lượng',
                        message: 'Số lượng nhập không được vượt quá 10000!'
                      });
                      return;
                    }
                    setTotalHandover(val.replace(/^0+(?=\d)/, ''));
                  }}
                  readOnly={false}
                  inputStyle={{ height: '42px', borderColor: '#ef4444', color: '#ef4444', fontWeight: '700', borderRadius: '12px' }}
                />
              </div>
            </div>

            {/* Row 3: Độ ẩm & Số dư */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'flex-end' }}>
              <div id="delivery-moisture-group" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <label style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: '800', 
                  color: '#475569', 
                  marginBottom: '2px', 
                  minHeight: '24px', 
                  display: 'block', 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%'
                }}>
                  Độ ẩm (%)
                </label>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', minWidth: 0 }}>
                  <MoistureStepper 
                    placeholder="Min"
                    value={moistureMin} 
                    onChange={setMoistureMin} 
                  />
                  <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>-</div>
                  <MoistureStepper 
                    placeholder="Max"
                    value={moistureMax} 
                    onChange={setMoistureMax} 
                  />
                </div>
              </div>
              <div id="delivery-residual-input" style={{ flex: 1, minWidth: 0 }}>
                <FormInput
                  label="Số dư"
                  type="number"
                  value={residual}
                  readOnly={true}
                  inputStyle={{ height: '36px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '800' }}
                />
              </div>
            </div>

            <div id="delivery-photos-group" style={{ marginBottom: '24px' }}>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>Ảnh bàn giao</h3>
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '16px' }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{
                    flex: 1, aspectRatio: '4/3', backgroundColor: '#f1f5f9', borderRadius: '8px',
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #e2e8f0', overflow: 'hidden'
                  }}>
                    <img src={photo.url} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px', background: '#fff', borderRadius: '50%', border: 'none',
                        width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <X size={14} color="#ef4444" strokeWidth={3} />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button
                    onClick={handleAddPhoto}
                    style={{
                      flex: 1, aspectRatio: '4/3', backgroundColor: '#f8fafc', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed #e2e8f0', cursor: 'pointer'
                    }}
                  >
                    <Camera size={24} color="#94a3b8" />
                  </button>
                )}
                {Array.from({ length: 3 - photos.length - (photos.length < 3 ? 1 : 0) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ flex: 1, aspectRatio: '4/3' }} />
                ))}
              </div>
            </div>

            <div id="delivery-note-group" style={{ marginBottom: '8px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Ghi chú</div>
              </div>
              <textarea
                rows="3"
                placeholder="Nhập ghi chú"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
          </div>
        </div>

        <div className="responsive-fixed-footer" style={{ backgroundColor: 'var(--bg-cream)',
          padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 30
        }}>
          {hasActionPermission && (
            <button
              id="delivery-submit-btn"
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                flex: 1, backgroundColor: isSubmitting ? '#94a3b8' : 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '14px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {isSubmitting ? 'Đang lưu...' : <><Check size={20} /> Xác nhận</>}
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            style={{
              flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px',
              padding: '14px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <RotateCcw size={20} /> Hủy
          </button>
        </div>

        <ConfirmModal
          isOpen={showConfirmModal}
          title="Xác nhận tạo phiếu"
          message={
            <div style={{ textAlign: 'left', marginTop: '10px' }}>
              <div style={{ marginBottom: '4px' }}><strong>Chi tiết:</strong> {selectedPart?.displayName || selectedPart?.name}</div>
              <div style={{ marginBottom: '4px' }}><strong>Quy cách:</strong> {selectedSpecification || 'Không có'}</div>
              <div style={{ marginBottom: '4px' }}><strong>Đơn hàng (Cont):</strong> {selectedOrderCodes.join(', ') || 'Chung'}</div>
              <div style={{ marginBottom: '4px' }}><strong>Số Lượng:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{totalHandover}</span></div>
              {residual && parseInt(residual) > 0 && (
                <div style={{ marginBottom: '4px' }}><strong>Số dư:</strong> <span style={{ color: '#b45309', fontWeight: 'bold' }}>{residual}</span></div>
              )}
              {parseInt(residual) >= (parseInt(totalHandover) || 0) * 0.2 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1.5px solid #fca5a5', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ⚠️ Cảnh báo: Số dư ({residual}) vượt quá hoặc bằng 20% tổng số lượng giao ({totalHandover})!
                </div>
              )}
              <div style={{ marginTop: '12px', color: '#64748b', fontSize: '0.9rem' }}>Bạn có chắc chắn muốn tạo phiếu giao này không?</div>
            </div>
          }
          onConfirm={executeSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />

        <MessageModal
          isOpen={messageModal.isOpen}
          type={messageModal.type}
          title={messageModal.title}
          message={messageModal.message}
          onConfirm={() => {
            setMessageModal({ ...messageModal, isOpen: false })
            if (messageModal.type === 'success') setShowPalletModal(true)
          }}
        />

        <PalletCardModal
          isOpen={showPalletModal}
          onClose={() => {
            setShowPalletModal(false)
            if (palletData) {
              navigate('/delivery-info', { state: { planId: selectedPlanId } })
            }
          }}
          data={previewPalletData}
          partProducts={partProducts}
        />

        <PlanDetailsModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          planId={selectedPlanId}
        />
      </div>
    </Layout>
  )
}

export default DeliveryCreate
