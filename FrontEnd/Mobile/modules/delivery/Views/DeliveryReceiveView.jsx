import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import FormInput from '@mobile/Shared/Views/components/form/FormInput'
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { API_URL, API_ROOT } from '@shared/services/api'
import useAuthStore from '@modules/auth/Models/authModel'
import { usePlanController } from '@modules/production/Controllers/planController'
import { useDeliveryController } from '@modules/delivery/Controllers/deliveryController'
import { ChevronLeft, Info, Package, Check, X, Pencil, Camera, RotateCcw, Image as ImageIcon, History, Truck, ArrowLeftRight } from 'lucide-react';

// --- Sub-components (extracted for better maintainability) ---
import HandoverTab from './components/DeliveryReceive/HandoverTab';
import InspectionChecklist from './components/DeliveryReceive/InspectionChecklist';
import QCSummarySection from './components/DeliveryReceive/QCSummarySection';
import DeliveryFooter from './components/DeliveryReceive/DeliveryFooter';
import { QRCodeCanvas } from 'qrcode.react'
import pendingQCStore from '@modules/delivery/Models/pendingQCStore'

// Trạng thái khởi tạo của QC — dùng INITIAL thay vì spread qcData cũ trong fetchQCData
const INITIAL_QC_DATA = {
  error_qty: 0, scrap_qty: 0,
  size: { is_pass: null, long: '', wide: '', thick: '', images: [] },
  structure: { is_pass: null, bend: '', wide: '', high: '', images: [] },
  visual: { is_pass: null, images: [] },
  moisture: { is_pass: null, min: '', max: '', images: [] },
  bend: { is_pass: null, min: '', max: '', images: [] },
  accessories: { is_pass: null, images: [] },
  visual_ext: { is_pass: null, images: [] },
  functional: { is_pass: null, images: [] },
  note: ''
}

/**
 * MH2.2 - Thông tin kiểm tra (Tiếp nhận)
 */
const DeliveryReceive = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, permissions } = useAuthStore()
  const { plans, fetchPlans, fetchDeliveriesByPlan } = usePlanController()
  const {
    fetchDeliveryDetail,
    confirmDeliveryReceipt,
    deleteDelivery,
    saveQCResults,
    createReturnSlip,
    confirmReturnSlip,
    fetchReturnsByDelivery,
    fetchQCDetail,
    fetchInspectionsByPlan
  } = useDeliveryController()

  // State
  const [delivery, setDelivery] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [activeTab, setActiveTab] = useState('handover')
  const [totalHandover, setTotalHandover] = useState('')
  const [totalReceived, setTotalReceived] = useState('')
  const [totalInspected, setTotalInspected] = useState('') // [NEW] Số lượng thực tế QC đã kiểm
  const [reserveVal, setReserveVal] = useState(0)
  const [noteVal, setNoteVal] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' })
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isReturnConfirmModalOpen, setIsReturnConfirmModalOpen] = useState(false)
  const [isCreateReturnConfirmOpen, setIsCreateReturnConfirmOpen] = useState(false) // [NEW] Popup xác nhận tạo phiếu trả hàng
  const [selectedReturnId, setSelectedReturnId] = useState(null)
  const [returns, setReturns] = useState([]) // Danh sách phiếu trả hàng liên quan
  const [qcData, setQcData] = useState(INITIAL_QC_DATA)
  const [expandedSections, setExpandedSections] = useState({ size: false, structure: false, visual: false, moisture: false, bend: false, accessories: false })
  const [inspectionResult, setInspectionResult] = useState('pass') // 'pass' or 'fail'

  // Return Form State
  const [returnQty, setReturnQty] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);
  const returnFileInputRef = useRef(null);

  // Check navigation state for returns
  const navState = location.state || {};
  const navReturns = navState.returns || [];
  const hasReturnsNav = navState.hasReturns || false;

  // Set active tab to returns if navigating with returns
  useEffect(() => {
    if (hasReturnsNav && navReturns.length > 0) {
      setActiveTab('returns');
      setReturns(navReturns);
    }
  }, [hasReturnsNav, navReturns]);

  // Return form photo handlers
  const handleAddReturnPhoto = () => {
    if (returnPhotos.length < 3 && returnFileInputRef.current) {
      returnFileInputRef.current.click();
    }
  };

  const handleReturnFileChange = (e) => {
    const file = e.target.files[0];
    if (file && returnPhotos.length < 3) {
      const newPhoto = {
        id: Date.now(),
        file: file,
        url: URL.createObjectURL(file)
      };
      setReturnPhotos([...returnPhotos, newPhoto]);
    }
    if (e.target) e.target.value = null;
  };

  const handleRemoveReturnPhoto = (id) => {
    setReturnPhotos(returnPhotos.filter(p => p.id !== id));
  };

  useEffect(() => {
    if (activeTab === 'returns' && delivery) {
      const defaultQty = delivery.quantity_error || qcData?.scrap_qty || 0;
      setReturnQty(prev => prev || (defaultQty > 0 ? defaultQty.toString() : ''));

      const failedCriteria = Object.entries(qcData || {})
        .filter(([key, value]) => value && value.is_pass === false)
        .map(([key, _]) => {
          const labels = {
            moisture: 'Độ ẩm', bend: 'Độ cong', visual: 'Bám dính sơn',
            size: 'Kích thước', structure: 'Kết cấu', functional: 'Tính năng', visual_ext: 'Ngoại quan'
          };
          return labels[key] || key;
        });

      const autoNote = failedCriteria.length > 0
        ? `Lỗi QC: ${failedCriteria.join(', ')}. ${qcData?.note || ''}`
        : (qcData?.note || '');

      setReturnNote(prev => prev || autoNote);
    }
  }, [activeTab, delivery, qcData]);

  const handleCreateReturnSlip = async () => {
    if (!returnQty || parseInt(returnQty) <= 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số lượng trả hàng hợp lệ!'
      });
      return;
    }

    const maxAllowed = delivery.quantity_received || delivery.quantity_total || 0;
    if (parseInt(returnQty) > maxAllowed) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Vượt quá số lượng',
        message: `Số lượng trả (${returnQty}) không được lớn hơn số lượng thực nhận/tổng giao (${maxAllowed})!`
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const fromStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'QC';
      await createReturnSlip(
        id,
        delivery.plan_id,
        fromStage,
        delivery.delivery_stage,
        delivery.part_name || 'Chi tiết không tên',
        returnQty,
        returnNote,
        returnPhotos,
        user?.id || 1
      );

      // Tự động đồng bộ gửi dữ liệu QC của phiếu bàn giao lên /qc/{delivery_id} (nếu QC chưa lưu trước đó)
      const hasQCSaved = delivery.quantity_error > 0 || delivery.quantity_returned > 0 || delivery.status === 'Trả Hàng' || delivery.status === 'Hoàn thành';
      if (!hasQCSaved) {
        try {
          await saveQCResults(id, qcData, totalInspected || delivery.quantity_inspection || 0, user?.id || 1);
        } catch (qcErr) {
          console.error('Lỗi đồng bộ QC khi tạo phiếu trả hàng:', qcErr);
        }
      }

      // Tải lại thông tin phiếu trả hàng
      try {
        const returnsData = await fetchReturnsByDelivery(id);
        setReturns(returnsData || []);
      } catch (err) {
        setReturns([]);
      }

      // Tải lại thông tin delivery
      const dResp = await fetchDeliveryDetail(id);
      if (dResp) setDelivery(dResp);

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã lập phiếu trả hàng và cập nhật trạng thái thành công!'
      });
    } catch (error) {
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi hệ thống',
        message: 'Không thể lập phiếu trả hàng: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerCreateReturnConfirm = () => {
    if (!returnQty || parseInt(returnQty) <= 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập số lượng trả hàng hợp lệ!'
      });
      return;
    }

    const maxAllowed = delivery.quantity_received || delivery.quantity_total || 0;
    if (parseInt(returnQty) > maxAllowed) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Vượt quá số lượng',
        message: `Số lượng trả (${returnQty}) không được lớn hơn số lượng thực nhận/tổng giao (${maxAllowed})!`
      });
      return;
    }

    setIsCreateReturnConfirmOpen(true);
  };

  // Handle return confirmation
  const handleConfirmReturn = async (returnId) => {
    setSelectedReturnId(returnId);
    setIsReturnConfirmModalOpen(true);
  };

  const handleConfirmReturnAction = async () => {
    const returnId = selectedReturnId;
    const noteInput = document.getElementById(`return-note-${returnId}`);
    const note = noteInput ? noteInput.value : '';

    try {
      await confirmReturnSlip(returnId, user?.id, note);

      // Refresh returns list
      try {
        const returnsData = await fetchReturnsByDelivery(id);
        setReturns(returnsData || []);
      } catch (err) {
        setReturns([]);
      }

      // Refresh delivery details
      const dResp = await fetchDeliveryDetail(id);
      if (dResp) setDelivery(dResp);

      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã xác nhận phiếu trả hàng thành công'
      });
    } catch (err) {
      console.error('Lỗi xác nhận phiếu trả hàng:', err)
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi',
        message: err.message
      });
    } finally {
      setIsReturnConfirmModalOpen(false);
      setSelectedReturnId(null);
    }
  };

  // --- State cho QC Chi tiết ---

  // fetchQCData: load từ API rồi merge pending store lên trên
  // (component remount khi navigate → pending phải được merge trong initial load)
  const fetchQCData = async (currentDelivery) => {
    try {
      const data = await fetchQCDetail(id);
      let newQCData = { ...INITIAL_QC_DATA }

      if (data && data.qc_info) {
        const info = data.qc_info;
        const results = typeof info.results_json === 'string' ? JSON.parse(info.results_json) : info.results_json;
        const serverImages = data.images || [];

        const deliveryData = currentDelivery || delivery;
        const errVal = deliveryData?.quantity_error !== undefined && deliveryData?.quantity_error !== null ? deliveryData.quantity_error : (results.error_qty || 0);
        const scrapVal = deliveryData?.quantity_returned !== undefined && deliveryData?.quantity_returned !== null ? deliveryData.quantity_returned : (results.scrap_qty || 0);

        newQCData = {
          ...INITIAL_QC_DATA,
          note: info.note || '',
          error_qty: scrapVal,
          scrap_qty: errVal
        };

        Object.keys(results).forEach(cat => {
          if (newQCData[cat] && typeof newQCData[cat] === 'object') {
            newQCData[cat] = {
              ...newQCData[cat],
              ...results[cat],
              images: serverImages
                .filter(img => img.description === `qc_${cat}`)
                .map(img => img.image_path)
            };
          }
        });
      }

      // Merge pending store lên trên API data
      if (pendingQCStore.hasPending(id)) {
        const pending = pendingQCStore.getAll(id)
        Object.entries(pending).forEach(([cat, result]) => {
          if (newQCData[cat] !== undefined) {
            newQCData[cat] = {
              ...newQCData[cat],
              is_pass: result.isPass,
              images: [...result.existingImages, ...result.newImages]
            }
          }
        })
      }

      setQcData(newQCData);
    } catch (err) {
      if (pendingQCStore.hasPending(id)) {
        const pending = pendingQCStore.getAll(id)
        setQcData(prev => {
          const updated = { ...prev }
          Object.entries(pending).forEach(([cat, result]) => {
            if (updated[cat] !== undefined) {
              updated[cat] = { ...updated[cat], is_pass: result.isPass, images: [...result.existingImages, ...result.newImages] }
            }
          })
          return updated
        })
      }
    }
  }

  const initDeliveryData = async () => {
    try {
      setLoading(true)
      const data = await fetchDeliveryDetail(id);
      if (!data) throw new Error('Không thể tải chi tiết phiếu');
      setDelivery(data)
      const initialQty = data.quantity_total || 0;
      setTotalHandover(initialQty.toString())

      // [NEW] Số lượng nhận mặc định = Tổng giao - SL Lỗi
      const errQty = data.quantity_error || 0;
      const calcReceived = Math.max(0, initialQty - errQty);

      // Nếu đã hoàn thành thì hiện số đã lưu, nếu chưa thì hiện số tính toán để SX xác nhận nhanh
      if (data.status === 'Hoàn thành' && data.quantity_received !== null) {
        setTotalReceived(data.quantity_received.toString())
      } else {
        setTotalReceived(calcReceived.toString())
      }

      // [NEW] Khởi tạo số lượng thực kiểm mặc định = 20% của số lượng nhận
      const defaultInspected = Math.ceil(calcReceived * 0.2);
      setTotalInspected(defaultInspected.toString());

      setReserveVal(data.residual || 0)
      setNoteVal(data.note || '')

      await fetchPlans()
      if (data.plan_id) {
        const history = await fetchDeliveriesByPlan(data.plan_id)
        setDeliveries(history || [])
      }

      // Check if activeTab should be 'returns' due to location state or delivery status
      if (location.state?.activeTab === 'returns' || data.status === 'Trả Hàng') {
        setActiveTab('returns')
      }

      // Load phiếu trả hàng liên kết trực tiếp bằng delivery_id
      try {
        const returnsData = await fetchReturnsByDelivery(id);
        setReturns(returnsData || []);
      } catch (err) {
        setReturns([])
      }

      // [NEW] Tải dữ liệu QC đi kèm, truyền trực tiếp data để cập nhật số lượng
      await fetchQCData(data);

      // [NEW] Kiểm tra trạng thái KT đầu vào để hiển thị trên Thẻ Pallet
      if (data.plan_id && data.part_name) {
          try {
              const stageParam = data.delivery_stage || '';
              const inspData = await fetchInspectionsByPlan(data.plan_id, stageParam);
              const hasInsp = inspData.some(i => 
                  (i.part_name === data.part_name || (i.part_name && i.part_name.startsWith(data.part_name + " - ")))
              );
              setDelivery(prev => ({ ...prev, qc_status: hasInsp ? 'Đã kiểm tra' : 'Chưa test' }));
          } catch (e) {
              console.error("Lỗi fetch inspections:", e);
          }
      }

    } catch (error) {
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể tải thông tin phiếu bàn giao.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Logic Phân quyền: Kiểm tra khớp công đoạn dựa trên cả Tên và Mô tả
  // Sử dụng phương thức so sánh linh hoạt (Fuzzy match)
  const userStageDesc = (user?.activeStageDescription || user?.stage_description || '').trim().toLowerCase().normalize('NFC');
  const userStageName = (user?.activeStageName || user?.stage_name || '').trim().toLowerCase().normalize('NFC');
  const deliveryReceiveStage = (delivery?.receiving_stage || '').trim().toLowerCase().normalize('NFC');
  const deliveryDeliveryStage = (delivery?.delivery_stage || '').trim().toLowerCase().normalize('NFC');

  // Hàm so sánh linh hoạt hỗ trợ viết tắt (vd: DH khớp với Định Hình)
  const isMatchStage = (userS, deliveryS) => {
    if (!userS || !deliveryS) return false;
    if (userS === deliveryS) return true;
    // Map viết tắt DH -> định hình và chuyển thành lowercase
    const uClean = userS.replace(/dh/g, 'định hình').replace(/\s+/g, '').toLowerCase();
    const dClean = deliveryS.replace(/dh/g, 'định hình').replace(/\s+/g, '').toLowerCase();
    return uClean.includes(dClean) || dClean.includes(uClean);
  };

  // Kiểm tra quyền QC hoặc Admin
  const userRoleString = [
    user?.permission_description,
    user?.permission_name,
    user?.role_description,
    user?.role_name,
    user?.full_name,
    user?.username
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');

  const isAdmin = userRoleString.includes('admin');
  const isQC = userRoleString.includes('qc') || isAdmin;
  const isProduction = userRoleString.includes('sản xuất') || userRoleString.includes('sx') || isAdmin;

  const isSender = isAdmin || ((isMatchStage(userStageDesc, deliveryDeliveryStage) || isMatchStage(userStageName, deliveryDeliveryStage)) && deliveryDeliveryStage !== '');
  const isReceiver = isAdmin || (((isMatchStage(userStageDesc, deliveryReceiveStage) || isMatchStage(userStageName, deliveryReceiveStage)) && deliveryReceiveStage !== '') && (!isSender || isAdmin));

  // [FLOW REVERSED] Theo yêu cầu mới: SX Nhận trước -> QC Test sau
  // SX được nhận ngay khi phiếu mới tạo (Chờ Nhận Hàng)
  const isPendingReceiving = delivery?.status === 'Chờ Nhận Hàng';
  // QC được kiểm sau khi SX đã nhận (Chờ Kiểm Tra hoặc Đã Nhận)
  const isPendingInspection = delivery?.status === 'Chờ Kiểm Tra' || delivery?.status === 'Đã Nhận';

  const userReceivePerm = permissions?.['mobile_delivery-receive'];
  const hasReceiveActionPermission = isAdmin || (
    userReceivePerm && userReceivePerm !== 'none' && 
    userReceivePerm.split(',').map(p => p.trim()).some(p => ['create', 'edit', 'approve'].includes(p))
  );

  const userCreatePerm = permissions?.['mobile_delivery-create'];
  const hasCreateActionPermission = isAdmin || (
    userCreatePerm && userCreatePerm !== 'none' && 
    userCreatePerm.split(',').map(p => p.trim()).includes('edit')
  );

  const canEdit = isSender && (delivery?.status === 'Chờ Nhận Hàng') && hasCreateActionPermission;
  const canConfirm = isReceiver && isProduction && isPendingReceiving && hasReceiveActionPermission;

  // QC được vào tab để xem hoặc chuẩn bị, nhưng chỉ được lưu khi status là Chờ Kiểm Tra / Đã Nhận
  const canAccessQCTab = (isQC || isAdmin) && isReceiver;
  const canSaveQC = (isQC || isAdmin) && (isPendingInspection || delivery?.status === 'Hoàn thành') && hasReceiveActionPermission;

  // 1. Lấy chi tiết phiếu
  useEffect(() => {
    initDeliveryData()
  }, [id])

  // [NEW] Logic tự chuyển sang tab Chất lượng nếu là nhân viên QC
  useEffect(() => {
    if (delivery && canAccessQCTab) {
      setActiveTab('quality');
    }
  }, [delivery, canAccessQCTab]);

  const handleTabChange = (tabId) => {
    if (tabId === 'quality' && !canAccessQCTab) {
      setMessageModal({ isOpen: true, type: 'error', title: 'Từ chối', message: 'Bạn không có quyền truy cập thông tin chất lượng.' });
      return;
    }
    setActiveTab(tabId);
  }

  const handleConfirm = () => {
    if (!isReceiver) {
      setMessageModal({ isOpen: true, type: 'error', title: 'Từ chối truy cập', message: 'Bạn thuộc công đoạn giao, không có quyền xác nhận phiếu này. Chỉ người nhận mới được phép xác nhận.' })
      return
    }
    // Chặn khi phiếu đang "Chờ Kiểm Tra" — phải đợi QC xác nhận xong
    if (delivery?.status === 'Chờ Kiểm Tra') {
      setMessageModal({ isOpen: true, type: 'warning', title: 'Chờ kiểm tra chất lượng', message: 'Phiếu này đang được QC kiểm tra. Vui lòng đợi QC xác nhận trước khi nhận hàng.' })
      return
    }
    if (!totalReceived) {
      setMessageModal({ isOpen: true, type: 'warning', title: 'Thiếu thông tin', message: 'Vui lòng nhập tổng số lượng thực nhận!' })
      return
    }
    setIsConfirmModalOpen(true)
  }

  // [MỚI] Chỉnh sửa phiếu — chuyển sang trang tạo phiếu với dữ liệu đã điền sẵn
  const handleEditDelivery = () => {
    if (!delivery) return
    navigate('/delivery-create', {
      state: {
        planId: delivery.plan_id,
        editDeliveryId: delivery.id,
        editData: {
          part_name: delivery.part_name,
          specification: delivery.specification,
          delivery_stage: delivery.delivery_stage,
          receiving_stage: delivery.receiving_stage,
          quantity_total: delivery.quantity_total,
          residual: delivery.residual,
          note: delivery.note,
          moisture_min: delivery.moisture_min,
          moisture_max: delivery.moisture_max,
          backup_qr: delivery.backup_qr,
          images: delivery.images || [],
          details: delivery.details || []
        }
      }
    })
  }

  // [MỚI] Xóa phiếu — chỉ cho phép khi phiếu còn Chờ Nhận Hàng
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const handleDeleteDelivery = () => {
    if (delivery?.status !== 'Chờ Nhận Hàng') {
      setMessageModal({ isOpen: true, type: 'error', title: 'Không thể xóa', message: 'Chỉ có thể xóa phiếu khi chưa được nhận.' })
      return
    }
    setIsDeleteConfirmOpen(true)
  }
  const handleConfirmDelete = async () => {
    setIsDeleteConfirmOpen(false)
    try {
      await deleteDelivery(id)
      setMessageModal({ isOpen: true, type: 'success', title: 'Đã xóa', message: 'Phiếu bàn giao đã được xóa thành công.' })
    } catch (err) {
      setMessageModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message })
    }
  }

  const handleSaveQC = async () => {
    try {
      const data = await saveQCResults(id, qcData, totalInspected, user?.id || 1);
      if (data.status === 'success') {
        pendingQCStore.clear(id) // Xóa pending của phiếu này sau khi đã lưu thành công
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'Thành công',
          message: 'Đã lưu kết quả kiểm tra QC chi tiết!',
          onConfirm: () => {
            setMessageModal({ isOpen: false });
            navigate('/delivery-info');
          }
        });
      }
    } catch (err) {
      setMessageModal({ isOpen: true, type: 'error', title: 'Lỗi lưu trữ', message: err.message })
    }
  }

  const handleFinalConfirm = async () => {
    try {
      setIsConfirmModalOpen(false)
      // SX xác nhận nhận hàng → trạng thái Chờ Kiểm Tra
      await confirmDeliveryReceipt(id, totalReceived, user?.id || 1)
      setMessageModal({ isOpen: true, type: 'success', title: 'Thành công', message: 'Đã xác nhận nhận hàng thành công!' })
    } catch (err) {
      setMessageModal({ isOpen: true, type: 'error', title: 'Lỗi', message: err.message })
    }
  }

  const handleGoToReturn = () => {
    setActiveTab('returns');
  }

  if (loading) {
    return (
      <Layout>
        <PageHeader title="G7 - Smart Flow" subTitle="MB2.2 | Thông tin kiểm tra" />
        <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải thông tin phiếu...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB2.2 | Thông tin kiểm tra" />
        <div id="receive-tabs" style={{ backgroundColor: 'var(--bg-cream)', padding: '5px 12px 10px 12px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          <Tabs
            tabs={[
              { id: 'handover', label: 'Thông tin bàn giao', icon: Truck },
              { id: 'quality', label: 'Thông tin chất lượng', icon: Package },
              { id: 'returns', label: 'Trả hàng', icon: ArrowLeftRight }
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </div>
      <div style={{ backgroundColor: 'var(--bg-cream)', flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{ padding: '8px 12px 100px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          {activeTab === 'handover' ? (
            <div id="receive-handover-card">
              <HandoverTab
                delivery={delivery}
                totalHandover={totalHandover}
                totalReceived={totalReceived}
                setTotalReceived={setTotalReceived}
                noteVal={noteVal}
                canConfirm={canConfirm}
                API_URL={API_ROOT}
              />
            </div>
          ) : activeTab === 'quality' ? (
            <>
              {/* Checklist kiểm tra phong cách Table */}
              <div id="receive-quality-checklist">
                <InspectionChecklist
                  id={id}
                  qcData={qcData}
                  navigate={navigate}
                />
              </div>

              {/* Thông tin xác nhận Section - Compact Premium Design */}
              <div id="receive-qc-summary">
                <QCSummarySection
                  delivery={delivery}
                  totalHandover={totalHandover}
                  totalReceived={totalReceived}
                  totalInspected={totalInspected}
                  setTotalInspected={setTotalInspected}
                  qcData={qcData}
                  setQcData={setQcData}
                  inspectionResult={inspectionResult}
                  setInspectionResult={setInspectionResult}
                />
              </div>
            </>
          ) : activeTab === 'returns' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {returns.length === 0 ? (
                // Nếu chưa có phiếu trả hàng
                (isQC || isAdmin) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>Lập Phiếu Trả Hàng</h3>
                      
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <FormInput
                            label="Từ công đoạn"
                            value={user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'QC'}
                            readOnly={true}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <FormInput
                            label="Đến công đoạn"
                            value={delivery?.delivery_stage || ''}
                            readOnly={true}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ flex: 2 }}>
                          <FormInput
                            label="Chi tiết bị trả"
                            value={delivery?.part_name || ''}
                            readOnly={true}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <FormInput
                            label="Số lượng trả"
                            type="number"
                            value={returnQty}
                            onChange={e => {
                              const inputVal = e.target.value.replace(/[^0-9]/g, '');
                              if (inputVal === '') {
                                setReturnQty('');
                                return;
                              }
                              const numVal = parseInt(inputVal);
                              const maxAllowed = delivery.quantity_received || delivery.quantity_total || 0;
                              if (numVal > maxAllowed) {
                                setMessageModal({
                                  isOpen: true,
                                  type: 'warning',
                                  title: 'Vượt quá số lượng nhận',
                                  message: `Số lượng trả (${numVal}) không được lớn hơn số lượng thực nhận/tổng giao của phiếu (${maxAllowed})!`
                                });
                                setReturnQty(maxAllowed.toString());
                              } else {
                                setReturnQty(numVal.toString());
                              }
                            }}
                            inputStyle={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: '700' }}
                          />
                        </div>
                      </div>

                      {/* File input ẩn */}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        ref={returnFileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleReturnFileChange} 
                      />

                      {/* Ảnh minh chứng */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>Ảnh minh chứng lỗi (tối đa 3 ảnh)</h4>
                        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '16px' }}>
                          {returnPhotos.map(photo => (
                            <div key={photo.id} style={{
                              flex: 1, aspectRatio: '4/3', backgroundColor: '#f1f5f9', borderRadius: '8px',
                              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '1px solid #e2e8f0', overflow: 'hidden'
                            }}>
                              <img src={photo.url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button onClick={() => handleRemoveReturnPhoto(photo.id)} style={{ position: 'absolute', top: '4px', right: '4px', background: '#fff', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <X size={14} color="#ef4444" strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                          {returnPhotos.length < 3 && (
                            <button onClick={handleAddReturnPhoto} style={{ flex: 1, aspectRatio: '4/3', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', cursor: 'pointer' }}>
                              <Camera size={24} color="#94a3b8" />
                            </button>
                          )}
                          {Array.from({ length: 3 - returnPhotos.length - (returnPhotos.length < 3 ? 1 : 0) }).map((_, i) => (
                            <div key={`empty-${i}`} style={{ flex: 1, aspectRatio: '4/3' }} />
                          ))}
                        </div>
                      </div>

                      {/* Ghi chú lỗi */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>Ghi chú / Lý do trả hàng</div>
                        <textarea 
                          rows="3" 
                          placeholder="Nhập lý do trả hàng chi tiết..." 
                          value={returnNote} 
                          onChange={e => setReturnNote(e.target.value)} 
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            color: '#1e293b',
                            fontFamily: 'inherit',
                            resize: 'none',
                            outline: 'none'
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#64748b',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    border: '2px dashed #e2e8f0',
                    marginTop: '10px'
                  }}>
                    <p style={{ margin: 0, fontStyle: 'italic' }}>Không có phiếu trả hàng nào cho chi tiết này.</p>
                  </div>
                )
              ) : (
                // Đã có phiếu trả hàng
                returns.map((ret) => {
                  // Original logic: sender of the delivery or admin can confirm
                  const userCanConfirmThisReturn = isSender || isAdmin;

                  return (
                    <div key={ret.id} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Thẻ trạng thái */}
                      <div style={{
                        backgroundColor: '#fef3c7',
                        color: '#d97706',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Info size={16} />
                        Trạng thái: {ret.status}
                      </div>

                      {/* Thông tin trả hàng Card */}
                      <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                          Thông tin trả hàng
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Công đoạn trả</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              {ret.from_stage}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Công đoạn nhận</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              {ret.to_stage}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Chi tiết bị trả</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{ret.part_name}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Số lượng trả</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626' }}>{ret.quantity}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Thời gian tạo</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(ret.created_at).toLocaleString('vi-VN')}</div>
                          </div>
                        </div>

                        {ret.note && (
                          <div style={{ backgroundColor: '#fefcfa', borderLeft: '4px solid #f59e0b', padding: '10px 14px', borderRadius: '4px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', marginBottom: '2px' }}>Ghi chú lỗi</div>
                            <div style={{ fontSize: '0.85rem', color: '#78350f' }}>{ret.note}</div>
                          </div>
                        )}

                        {/* Ảnh minh chứng từ Server */}
                        {ret.images && ret.images.length > 0 && (
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Ảnh minh chứng</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {ret.images.map((img, idx) => (
                                <div key={idx} style={{ width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                  <img 
                                    src={`${API_ROOT}${img.image_path}`} 
                                    alt={`Proof ${idx}`} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => window.open(`${API_ROOT}${img.image_path}`, '_blank')}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Form xác nhận nếu chưa xác nhận */}
                      {ret.status === 'Chờ SX Xác Nhận' && userCanConfirmThisReturn ? (
                        <div style={{
                          backgroundColor: '#fff',
                          borderRadius: '16px',
                          padding: '20px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={18} color="#16a34a" />
                            Ghi chú xác nhận
                          </h4>
                          <textarea
                            id={`return-note-${ret.id}`}
                            placeholder="Nhập ghi chú khi xác nhận nhận hàng (ví dụ: Đã nhận, sẽ kiểm tra và sửa trong ngày hôm nay...)"
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '10px',
                              fontSize: '0.85rem',
                              fontFamily: 'inherit',
                              minHeight: '80px',
                              resize: 'none',
                              outline: 'none',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                          />
                          <button
                            onClick={() => handleConfirmReturn(ret.id)}
                            style={{
                              padding: '14px 20px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: '800',
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <Check size={18} />
                            Xác Nhận Nhận Hàng
                          </button>
                        </div>
                      ) : ret.status === 'Chờ SX Xác Nhận' ? (
                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          textAlign: 'center',
                          color: '#64748b',
                          fontSize: '0.85rem'
                        }}>
                          Chỉ tài khoản thuộc công đoạn <strong>{ret.to_stage}</strong> mới được quyền xác nhận phiếu trả hàng này.
                        </div>
                      ) : null}

                      {/* Đã xác nhận */}
                      {ret.status === 'Đã SX Xác Nhận' && (
                        <div style={{
                          backgroundColor: '#fff',
                          borderRadius: '16px',
                          padding: '20px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={18} />
                            Đã xác nhận nhận hàng
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                            Xác nhận vào: <strong>{new Date(ret.sx_confirmed_at).toLocaleString('vi-VN')}</strong>
                          </div>
                          {ret.sx_confirmation_note && (
                            <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534' }}>
                              <strong>Ghi chú phản hồi:</strong> {ret.sx_confirmation_note}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        {/* Sticky Footer Actions */}
        <div id="receive-action-buttons">
          <DeliveryFooter 
            delivery={delivery}
            isQC={isQC}
            isAdmin={isAdmin}
            isSender={isSender}
            isReceiver={isReceiver}
            canAccessQCTab={canAccessQCTab}
            canSaveQC={canSaveQC}
            inspectionResult={inspectionResult}
            activeTab={activeTab}
            handleGoToReturn={handleGoToReturn}
            handleSaveQC={handleSaveQC}
            handleCreateReturnSlip={triggerCreateReturnConfirm}
            handleConfirm={handleConfirm}
            handleEditDelivery={handleEditDelivery}
            handleDeleteDelivery={handleDeleteDelivery}
            isSubmitting={isSubmitting}
            isPendingReceiving={isPendingReceiving}
            isPendingInspection={isPendingInspection}
            navigate={navigate}
            hasReceiveActionPermission={hasReceiveActionPermission}
            hasCreateActionPermission={hasCreateActionPermission}
          />
        </div>

        <MessageModal
          {...messageModal}
          onConfirm={() => {
            if (messageModal.onConfirm) {
              messageModal.onConfirm();
            } else {
              setMessageModal({ ...messageModal, isOpen: false });
              if (messageModal.type === 'success') navigate('/delivery-info');
            }
          }}
        />
        <ConfirmModal isOpen={isConfirmModalOpen} title="Xác nhận nhận hàng" message={`Bạn có chắc chắn muốn xác nhận nhận ${totalReceived} sản phẩm này không?`} onConfirm={handleFinalConfirm} onCancel={() => setIsConfirmModalOpen(false)} confirmText="Xác nhận" cancelText="Quay lại" />
        <ConfirmModal isOpen={isReturnConfirmModalOpen} title="Xác nhận phiếu trả hàng" message="Bạn có chắc chắn muốn xác nhận phiếu trả hàng này?" onConfirm={handleConfirmReturnAction} onCancel={() => setIsReturnConfirmModalOpen(false)} confirmText="Xác nhận" cancelText="Hủy" />
        <ConfirmModal isOpen={isCreateReturnConfirmOpen} title="Xác nhận trả hàng" message={`Bạn có chắc chắn muốn lập phiếu trả hàng với số lượng ${returnQty} không?`} onConfirm={() => { setIsCreateReturnConfirmOpen(false); handleCreateReturnSlip(); }} onCancel={() => setIsCreateReturnConfirmOpen(false)} confirmText="Xác nhận" cancelText="Hủy" />
        <ConfirmModal isOpen={isDeleteConfirmOpen} title="Xóa phiếu bàn giao" message={`Bạn có chắc chắn muốn xóa phiếu bàn giao DLV-${id} không? Hành động này không thể hoàn tác.`} onConfirm={handleConfirmDelete} onCancel={() => setIsDeleteConfirmOpen(false)} confirmText="Xóa" cancelText="Hủy" />
      </div>
    </Layout>
  )
}

export default DeliveryReceive
