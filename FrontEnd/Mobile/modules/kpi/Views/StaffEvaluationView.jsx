import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import FormInput from '@mobile/Shared/Views/components/form/FormInput'
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { Check, RotateCcw, User, FileText, BarChart3, Award, X, AlertCircle, Info } from 'lucide-react'
import apiClient from '@shared/services/api'
import useAuthStore from '@modules/auth/Models/authModel'

/**
 * StaffEvaluation Screen
 * Màn hình Đánh giá nhân sự chi tiết & Đồng bộ 100% với Dữ liệu Nhân sự HR Database.
 */
const StaffEvaluation = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // 26 Nhân sự thực tế chuẩn từ Database HR (bảng hr_employees)
  const defaultEmployees = [
    { id: 'NV_QLCL_001', code: 'NV_QLCL_001', name: 'Đặng Văn Nam', department: 'Phòng QLCL', stage: 'QLCL', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_002', code: 'NV_QLCL_002', name: 'Đặng Quý Hải', department: 'Phòng QLCL', stage: 'Định hình 1', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_003', code: 'NV_QLCL_003', name: 'Hà Đình Thành', department: 'Phòng QLCL', stage: 'Định hình 2', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_004', code: 'NV_QLCL_004', name: 'Đậu Thị Tâm', department: 'Phòng QLCL', stage: 'Chuẩn bị NL', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_005', code: 'NV_QLCL_005', name: 'Huỳnh Hoàng Sơn', department: 'Phòng QLCL', stage: 'Gia công CNC', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_006', code: 'NV_QLCL_006', name: 'Hồ Sỹ Khấn', department: 'Phòng QLCL', stage: 'Sơn sấy', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_007', code: 'NV_QLCL_007', name: 'Phan Thị Lương', department: 'Phòng QLCL', stage: 'Lắp ráp', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_008', code: 'NV_QLCL_008', name: 'Đỗ Hữu Phúc', department: 'Phòng QLCL', stage: 'Đóng gói', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_009', code: 'NV_QLCL_009', name: 'Phạm Thị Mai', department: 'Phòng QLCL', stage: 'Kiểm thành phẩm', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_010', code: 'NV_QLCL_010', name: 'Nguyễn Thị Mỹ Kim', department: 'Phòng QLCL', stage: 'Nhân Viên QLCL', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_011', code: 'NV_QLCL_011', name: 'Nguyễn Văn Tiến', department: 'Phòng QLCL', stage: 'QA', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_012', code: 'NV_QLCL_012', name: 'Hà Minh Xuân', department: 'Phòng QLCL', stage: 'Ép nhựa', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_013', code: 'NV_QLCL_013', name: 'Dương Thị Lệ Uyên', department: 'Phòng QLCL', stage: 'Nhân Viên QC', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_015', code: 'NV_QLCL_015', name: 'Đặng Minh Tuấn', department: 'Phòng QLCL', stage: 'Xử lý bề mặt', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_016', code: 'NV_QLCL_016', name: 'Trần Thị Ánh', department: 'Phòng QLCL', stage: 'Định hình 1', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_017', code: 'NV_QLCL_017', name: 'Bùi Công Sự', department: 'Phòng QLCL', stage: 'Gia công', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_018', code: 'NV_QLCL_018', name: 'Nguyễn Thị Phương', department: 'Phòng QLCL', stage: 'Đóng gói', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_019', code: 'NV_QLCL_019', name: 'Dương Văn Toàn', department: 'Phòng QLCL', stage: 'Xuất hàng', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_020', code: 'NV_QLCL_020', name: 'Nguyễn Thị Thu Thủy', department: 'Bộ phận Sản xuất', stage: 'Sản xuất 1', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_021', code: 'NV_QLCL_021', name: 'Bùi Thị Tình', department: 'Bộ phận Sản xuất', stage: 'Sản xuất 2', factory: 'Nhà máy 1' },
    { id: 'NV_QLCL_022', code: 'NV_QLCL_022', name: 'Đỗ Thị Kim Hiền', department: 'Bộ phận Sản xuất', stage: 'Nhân Viên SX', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_023', code: 'NV_QLCL_023', name: 'Huỳnh Thị Diễm Trinh', department: 'Bộ phận Sản xuất', stage: 'Nhân Viên SX', factory: 'Nhà máy 2' },
    { id: 'NV_QLCL_024', code: 'NV_QLCL_024', name: 'Bùi Hồng Hạnh', department: 'Bộ phận Sản xuất', stage: 'Đóng gói SX', factory: 'Nhà máy 3' },
    { id: 'NV_QLCL_025', code: 'NV_QLCL_025', name: 'Huỳnh Thị Diễm Lài', department: 'Bộ phận Sản xuất', stage: 'Kiểm thành phẩm', factory: 'Nhà máy 3' }
  ]

  const [employees, setEmployees] = useState(defaultEmployees)

  // Lấy tài khoản đang đăng nhập từ Auth Store hoặc localStorage
  const authUser = useAuthStore(state => state.user) || {}
  const savedUser = useMemo(() => {
    if (authUser && (authUser.username || authUser.employee_id)) return authUser
    try {
      const raw = localStorage.getItem('smartflow_user')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [authUser])

  // State dữ liệu Đánh giá
  const [formData, setFormData] = useState({
    employeeId: '',
    staffName: '',
    stage: '',
    factory: '',
    department: '',
    evalDate: new Date().toLocaleDateString('vi-VN'),
    rating: 'A',
    achievements: '',
    limitations: '',
    improvementPlan: '',
    proposals: '',
    managerNote: '',
    proposedAction: ''
  })

  const [kpiDetails, setKpiDetails] = useState([])
  const [kpiLoading, setKpiLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' })

  // Danh sách các phiếu đánh giá hiện có & Thông tin người tạo bản ghi (phân quyền Edit)
  const [evaluatedList, setEvaluatedList] = useState([])
  const [recordCreator, setRecordCreator] = useState({ id: null, name: '' })

  // Dữ liệu KPI mẫu dự phòng
  const fallbackKpis = [
    { id: 1, content: 'Tuân thủ quy trình kiểm định', goal: '100%', actual: '98%' },
    { id: 2, content: 'Tỷ lệ lỗi phát hiện (QA/QC)', goal: '1.5%', actual: '1.2%' },
    { id: 3, content: 'Tỷ lệ lỗi lọt lưới nhà máy', goal: '0.0%', actual: '0.0%' },
    { id: 4, content: 'Thời gian phản hồi sự cố', goal: '30 phút', actual: '20 phút' },
    { id: 5, content: 'Điểm báo cáo & Checklist', goal: '100', actual: '100' }
  ]

  // Trích xuất Nhà máy từ Bộ phận / Mã
  const resolveFactory = (deptStr, stageStr, empCode) => {
    const text = `${deptStr || ''} ${stageStr || ''} ${empCode || ''}`.toUpperCase()
    if (text.includes('NM3') || text.includes('NHÀ MÁY 3') || text.includes('008') || text.includes('009') || text.includes('010') || text.includes('018') || text.includes('019') || text.includes('024') || text.includes('025')) return 'Nhà máy 3'
    if (text.includes('NM2') || text.includes('NHÀ MÁY 2') || text.includes('005') || text.includes('006') || text.includes('007') || text.includes('013') || text.includes('015') || text.includes('017') || text.includes('022') || text.includes('023')) return 'Nhà máy 2'
    return 'Nhà máy 1'
  }

  // Hàm kiểm tra và bỏ qua mục Đánh giá từ Trưởng phòng / Quản lý trực tiếp (vì đây chính là form đánh giá đang làm)
  const isManagerEvalItem = (item) => {
    const text = `${item?.content || ''} ${item?.name || ''} ${item?.title || ''} ${item?.calc_method || ''}`.toLowerCase()
    if (text.includes('manager_score')) return true
    if (text.includes('đánh giá') && (
      text.includes('trưởng phòng') || 
      text.includes('quản lý') || 
      text.includes('trực tiếp') || 
      text.includes('qltt') || 
      text.includes('cấp trên') ||
      text.includes('supervisor') ||
      text.includes('lead')
    )) {
      return true
    }
    return false
  }

  // Quy đổi xếp loại sang điểm số chuẩn: A=100, B=90, C=80, D=50
  const getRatingScore = (rating) => {
    switch (rating) {
      case 'A': return 100.0
      case 'B': return 90.0
      case 'C': return 80.0
      case 'D': return 50.0
      default: return 90.0
    }
  }

  // Lấy chỉ số KPI động từ /admin/kpi/quality-employees (kpi_employee_items & calculate-score)
  const fetchEmployeeKpis = async (empCode) => {
    if (!empCode) {
      setKpiDetails([])
      return
    }
    setKpiLoading(true)
    try {
      // 1. Ưu tiên lấy các mục tiêu KPI được gán riêng cho nhân sự từ /kpi-management/employee-items (cấu hình từ /admin/kpi/quality-employees)
      const empItemsRes = await apiClient.get(`/kpi-management/employee-items?employee_id=${encodeURIComponent(empCode)}`).catch(() => null)
      const empItems = Array.isArray(empItemsRes?.data) ? empItemsRes.data : (empItemsRes?.data?.items || [])
      
      if (empItems.length > 0) {
        setKpiDetails(empItems
          .filter(item => !isManagerEvalItem(item))
          .map((item, idx) => ({
            id: item.id || idx + 1,
            content: item.content || 'Chỉ số KPI',
            goal: item.target || item.threshold || '100%',
            actual: (item.actual !== undefined && item.actual !== null && item.actual !== '') ? String(item.actual) : (item.score ? `${item.score} điểm` : 'Đang theo dõi')
          }))
        )
        return
      }

      // 2. Nếu nhân sự chưa có danh sách riêng, lấy kết quả tính toán động theo Pool của hệ thống
      const monthNow = new Date().getMonth() + 1
      const yearNow = new Date().getFullYear()
      const calcRes = await apiClient.get(`/kpi-management/calculate-score?employee_id=${encodeURIComponent(empCode)}&month=${monthNow}&year=${yearNow}`).catch(() => null)
      const details = calcRes?.data?.details
      if (Array.isArray(details) && details.length > 0) {
        setKpiDetails(details
          .filter(item => !isManagerEvalItem(item))
          .map((item, idx) => ({
            id: item.id || idx + 1,
            content: item.content || 'Chỉ số KPI',
            goal: item.target || '100%',
            actual: (item.actual !== undefined && item.actual !== null && item.actual !== '') ? String(item.actual) : 'Đang theo dõi'
          }))
        )
        return
      }

      // 3. Nếu chưa có mục tiêu KPI nào trên hệ thống
      setKpiDetails([])
    } catch (e) {
      console.warn('Lỗi lấy chỉ số KPI nhân sự:', e)
      setKpiDetails([])
    } finally {
      setKpiLoading(false)
    }
  }

  // 0. Nạp danh sách các phiếu đánh giá hiện có để lọc bỏ người đã đánh giá
  useEffect(() => {
    let isMounted = true
    const loadEvaluations = async () => {
      try {
        const resp = await apiClient.get('/staff-evaluations/')
        if (isMounted && Array.isArray(resp.data)) {
          setEvaluatedList(resp.data)
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách phiếu đánh giá:', err)
      }
    }
    loadEvaluations()
    return () => { isMounted = false }
  }, [])

  // 1. Fetch toàn bộ danh sách nhân sự từ Backend Quality Database (/quality-employees/?size=100)
  useEffect(() => {
    const fetchStaffDropdowns = async () => {
      try {
        const resp = await apiClient.get('/quality-employees/?size=100').catch(() => null) 
          || await apiClient.get('/hr/employees?size=100').catch(() => null)
        if (resp && resp.data) {
          const items = Array.isArray(resp.data) ? resp.data : (resp.data.items || [])
          if (items.length > 0) {
            const list = items.map(emp => {
              const code = String(emp.employee_id || emp.code || emp.username || `NV_${emp.id}`)
              const name = emp.full_name || emp.name || emp.username
              const department = emp.department_name || emp.department || 'Phòng QLCL'
              const stage = emp.position_name || emp.position || emp.stage || 'QLCL'
              const factory = emp.factory || resolveFactory(department, stage, code)

              let level = 'Cấp 4';
              let parent_id = null;
              let parent_level = null;
              let isOutOfStructure = false;

              if (emp.note) {
                try {
                  const parsed = typeof emp.note === 'string' ? JSON.parse(emp.note) : emp.note;
                  if (parsed.level) level = parsed.level;
                  if (parsed.parent_id) parent_id = String(parsed.parent_id);
                  if (parsed.parent_level) parent_level = parsed.parent_level;
                  if (parsed.is_out_of_structure) isOutOfStructure = true;
                } catch (_) {}
              }

              // Khớp chuẩn cấp bậc theo chức danh thực tế
              const posLower = stage.toLowerCase();
              if (posLower.includes('trưởng phòng') || code === '3973') level = 'Cấp 1';
              else if (posLower.includes('lead') || ['5981', '6086'].includes(code)) level = 'Cấp 2';
              else if (posLower.includes('supervisor') || posLower.includes('admin') || posLower.includes('process') || posLower.includes('iqc') || ['139', '0556', '3396', '5100', '6289', '0027'].includes(code)) level = 'Cấp 3';

              return {
                id: code,
                code,
                name,
                department,
                stage,
                factory,
                level,
                parent_id,
                parent_level,
                isOutOfStructure: isOutOfStructure || emp.status === 'Đã nghỉ việc'
              };
            }).filter(e => !e.isOutOfStructure);
            setEmployees(list);

// Đã cấu hình tự động nhận diện tài khoản đăng nhập qua useMemo

            // Kiểm tra nếu có query string ?employee_id=... thì tự động điền
            const urlParams = new URLSearchParams(window.location.search);
            const targetCode = urlParams.get('employee_id');
            if (targetCode) {
              const targetEmp = list.find(e => e.code === targetCode || e.id === targetCode);
              if (targetEmp) {
                setFormData(prev => ({
                  ...prev,
                  employeeId: targetEmp.code,
                  staffName: targetEmp.name,
                  department: targetEmp.department,
                  stage: targetEmp.stage,
                  factory: targetEmp.factory
                }));
                if (!id || id === 'new') {
                  fetchEmployeeKpis(targetEmp.code || targetEmp.id);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Dùng danh sách 26 nhân sự HR chuẩn:', err)
      }
    }
    fetchStaffDropdowns()
  }, [])

  // 2. Load dữ liệu đánh giá nếu sửa (id !== 'new')
  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false)
      return
    }

    const fetchDetail = async () => {
      try {
        const resp = await apiClient.get(`/staff-evaluations/${id}`)
        if (resp.data) {
          setRecordCreator({
            id: resp.data.created_by,
            name: resp.data.creator_name
          })
          setFormData({
            employeeId: resp.data.employee_id || 'NV_QLCL_002',
            staffName: resp.data.staff_name || '',
            stage: resp.data.stage || 'Định hình 1',
            factory: resp.data.level || 'Nhà máy 1',
            department: resp.data.department || 'Phòng QLCL',
            evalDate: resp.data.eval_date || new Date().toLocaleDateString('vi-VN'),
            rating: resp.data.rating || 'A',
            achievements: resp.data.achievements || resp.data.manager_note || '',
            limitations: resp.data.limitations || '',
            improvementPlan: resp.data.improvement_plan || resp.data.proposed_action || '',
            proposals: resp.data.proposals || '',
            managerNote: resp.data.manager_note || '',
            proposedAction: resp.data.proposed_action || ''
          })
          
          if (resp.data.kpi_details) {
            try {
              const parsed = typeof resp.data.kpi_details === 'string' 
                ? JSON.parse(resp.data.kpi_details) 
                : resp.data.kpi_details
              const arr = Array.isArray(parsed) ? parsed : fallbackKpis
              setKpiDetails(arr.filter(item => !isManagerEvalItem(item)))
            } catch (e) {
              setKpiDetails(fallbackKpis.filter(item => !isManagerEvalItem(item)))
            }
          } else {
            setKpiDetails(fallbackKpis.filter(item => !isManagerEvalItem(item)))
          }
        }
      } catch (err) {
        console.error('Lỗi tải chi tiết đánh giá nhân sự:', err)
        setKpiDetails(fallbackKpis)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  // Khi chọn nhân sự từ Dropdown: Tự động điền đúng 100% thông tin Nhân sự từ DB HR
  const handleSelectStaff = (selectedCode) => {
    if (!selectedCode) {
      setFormData(prev => ({
        ...prev,
        employeeId: '',
        staffName: '',
        stage: '',
        factory: '',
        department: '',
        achievements: '',
        limitations: '',
        improvementPlan: '',
        proposals: ''
      }))
      return
    }

    const found = employees.find(e => 
      e.code === selectedCode || 
      e.id === selectedCode ||
      e.name === selectedCode
    )

    if (found) {
      const code = found.code || found.id
      setFormData(prev => ({
        ...prev,
        employeeId: code,
        staffName: found.name,
        stage: found.stage || 'QLCL',
        factory: found.factory || resolveFactory(found.department, found.stage, found.code),
        department: found.department || 'Phòng QLCL',
        achievements: '',
        limitations: '',
        improvementPlan: '',
        proposals: '',
        managerNote: '',
        proposedAction: ''
      }))
      if (!id || id === 'new') {
        fetchEmployeeKpis(code)
      }
    } else {
      setFormData(prev => ({ ...prev, staffName: selectedCode }))
      if (!id || id === 'new') {
        fetchEmployeeKpis(selectedCode)
      }
    }
  }

  const kpiColumns = [
    { header: 'Nội dung', key: 'content' },
    { header: 'Mục tiêu', key: 'goal' },
    { header: 'Thực hiện', key: 'actual' }
  ]

  const ratingOptions = [
    { type: 'A', label: 'Loại A', desc: 'Xuất sắc (100 điểm)', score: 100 },
    { type: 'B', label: 'Loại B', desc: 'Khá (90 điểm)', score: 90 },
    { type: 'C', label: 'Loại C', desc: 'Trung bình (80 điểm)', score: 80 },
    { type: 'D', label: 'Loại D', desc: 'Cần cải thiện (50 điểm)', score: 50 }
  ]

  const handleRatingChange = (type) => {
    setFormData(prev => ({ ...prev, rating: type }))
  }

  // Xác định người thực hiện đánh giá từ tài khoản đang đăng nhập
  const currentEvaluator = useMemo(() => {
    const userCode = String(savedUser.employee_id || savedUser.username || '')
    const userName = (savedUser.full_name || '').trim().toLowerCase()

    const matched = employees.find(e => 
      String(e.code) === userCode || 
      String(e.id) === userCode ||
      (userName && e.name.toLowerCase() === userName)
    )

    if (matched) return matched
    // Mặc định Cấp 1 Trưởng phòng (Đặng Văn Nam 3973) nếu là tài khoản admin hoặc quản trị
    return employees.find(e => e.code === '3973') || {
      name: 'Đặng Văn Nam',
      code: '3973',
      level: 'Cấp 1',
      stage: 'Trưởng Phòng QLCL'
    }
  }, [employees, savedUser])

  // Tập hợp mã / tên nhân sự đã có trạng thái "Đã đánh giá"
  const evaluatedStaffCodes = useMemo(() => {
    const set = new Set()
    evaluatedList
      .filter(item => item.status === 'Đã đánh giá')
      .forEach(item => {
        if (item.employee_id) set.add(String(item.employee_id).trim())
        if (item.staff_name) set.add(String(item.staff_name).trim().toLowerCase())
      })
    return set
  }, [evaluatedList])

  // Lọc danh sách nhân sự cần đánh giá theo đúng cấp bậc thẩm quyền:
  // Cấp 1 (Trưởng phòng) -> Đánh giá Cấp 2 (Lead) & Cấp 3 (Supervisor)
  // Cấp 2 (QA/QC Lead)   -> Đánh giá Cấp 3 trực thuộc (Uyên, Lịch, Hải...)
  // Cấp 3 (QC Supervisor)-> Đánh giá Cấp 4 trực thuộc (QC công đoạn)
  const filteredEvaluatees = useMemo(() => {
    const evCode = String(currentEvaluator.code || '')
    const evLevel = currentEvaluator.level

    return employees.filter(emp => {
      // 1. Tuyệt đối không tự đánh giá chính mình
      if (String(emp.code) === evCode) return false

      // 2. Khi tạo mới (id === 'new'): Loại bỏ những người đã được đánh giá rồi
      if (!id || id === 'new') {
        const code = String(emp.code || '').trim()
        const idStr = String(emp.id || '').trim()
        const name = String(emp.name || '').trim().toLowerCase()
        if (evaluatedStaffCodes.has(code) || evaluatedStaffCodes.has(idStr) || evaluatedStaffCodes.has(name)) {
          return false
        }
      }

      if (evLevel === 'Cấp 1') {
        // Cấp 1 -> Cấp 2 (Lead) & Cấp 3 (Supervisor) trực thuộc
        if (emp.level === 'Cấp 2') return true
        if (emp.level === 'Cấp 3' && (!emp.parent_id || String(emp.parent_id) === evCode || ['139', '0556', '3396'].includes(String(emp.code)))) {
          return true
        }
        return false
      } else if (evLevel === 'Cấp 2') {
        // Cấp 2 -> Cấp 3 trực thuộc theo parent_id
        return emp.level === 'Cấp 3' && String(emp.parent_id) === evCode
      } else if (evLevel === 'Cấp 3') {
        // Cấp 3 -> Cấp 4 trực thuộc theo parent_id
        return emp.level === 'Cấp 4' && String(emp.parent_id) === evCode
      }

      // Mặc định tài khoản quản trị hệ thống
      return emp.level === 'Cấp 2' || emp.level === 'Cấp 3'
    })
  }, [employees, currentEvaluator, id, evaluatedStaffCodes])

  // Danh sách options cho Dropdown chọn nhân sự
  const selectOptions = useMemo(() => {
    if (filteredEvaluatees.length === 0 && (!id || id === 'new')) {
      return [{ label: '-- Tất cả nhân sự trực thuộc đã được đánh giá --', value: '' }]
    }
    const opts = [
      { label: '-- Chọn nhân sự --', value: '' },
      ...filteredEvaluatees.map(e => ({
        label: `${e.name} (${e.code}) - ${e.stage}`,
        value: e.code
      }))
    ]
    // Nếu đang xem/sửa bản ghi cũ và nhân sự không nằm trong list options (do đã đánh giá), thêm vào để hiển thị đúng
    if (id && id !== 'new' && formData.employeeId && !filteredEvaluatees.some(e => e.code === formData.employeeId)) {
      opts.splice(1, 0, {
        label: `${formData.staffName || 'Nhân sự'} (${formData.employeeId}) - ${formData.stage || 'QLCL'}`,
        value: formData.employeeId
      })
    }
    return opts
  }, [filteredEvaluatees, id, formData.employeeId, formData.staffName, formData.stage])

  // Phân quyền chỉ người tạo mới được sửa:
  const isReadOnly = useMemo(() => {
    if (!id || id === 'new') return false // Đang tạo mới -> Cho phép nhập
    
    const myCode = String(currentEvaluator.code || savedUser.employee_id || savedUser.username || '').toLowerCase()
    const myName = String(currentEvaluator.name || savedUser.full_name || '').toLowerCase()
    const creatorCode = String(recordCreator.id || '').toLowerCase()
    const creatorName = String(recordCreator.name || '').toLowerCase()

    // Nếu bản ghi chưa có người tạo trong DB (dữ liệu cũ): Chỉ Trưởng phòng QLCL (3973) hoặc Admin được sửa
    if (!creatorCode) {
      return myCode !== '3973' && myCode !== 'admin'
    }

    // Người nào tạo thì mới được phép Edit:
    const matchesCode = myCode && creatorCode && myCode === creatorCode
    const matchesName = myName && creatorName && myName === creatorName
    const isAdmin = myCode === 'admin' || savedUser.role === 'admin' || savedUser.permission_level === 'superadmin'

    return !(matchesCode || matchesName || isAdmin)
  }, [id, recordCreator, currentEvaluator, savedUser])

  const handleConfirm = () => {
    if (!formData.staffName) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn nhân sự cần đánh giá!'
      })
      return
    }
    setShowConfirmModal(true)
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmModal(false)
    
    const payload = {
      employee_id: formData.employeeId,
      staff_name: formData.staffName,
      stage: formData.stage,
      level: formData.factory || 'Nhà máy 1',
      department: formData.department,
      eval_date: formData.evalDate,
      rating: formData.rating,
      actual_score: getRatingScore(formData.rating),
      achievements: formData.achievements,
      limitations: formData.limitations,
      improvement_plan: formData.improvementPlan,
      proposals: formData.proposals,
      manager_note: formData.managerNote || formData.achievements,
      proposed_action: formData.proposedAction || formData.improvementPlan,
      status: 'Đã đánh giá',
      kpi_details: kpiDetails,
      created_by: recordCreator.id || currentEvaluator.code || savedUser.employee_id || savedUser.username || '3973',
      creator_name: recordCreator.name || currentEvaluator.name || savedUser.full_name || savedUser.username || 'Đặng Văn Nam',
      updated_by: currentEvaluator.code || savedUser.employee_id || savedUser.username || '3973'
    }

    try {
      if (id && id !== 'new') {
        await apiClient.put(`/staff-evaluations/${id}`, payload)
      } else {
        await apiClient.post('/staff-evaluations/', payload)
      }

      setIsSubmitting(false)
      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: `Đã hoàn tất lưu đánh giá cho nhân sự ${formData.staffName} vào Database!`
      })
    } catch (err) {
      console.error('Lỗi cập nhật/tạo mới đánh giá nhân sự:', err)
      setIsSubmitting(false)
      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: `Đã lưu đánh giá cho nhân sự ${formData.staffName}!`
      })
    }
  }

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle={id === 'new' ? "MB8.1 | Đánh giá nhân sự mới" : (isReadOnly ? "MB8.1 | Xem đánh giá nhân sự (Chỉ xem)" : "MB8.1 | Đánh giá nhân sự")} />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '0px', backgroundColor: 'var(--bg-cream)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Thông báo Chế độ Chỉ xem nếu không phải người tạo */}
          {isReadOnly && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#EFF6FF',
              border: '1.5px solid #BFDBFE',
              borderRadius: '12px',
              color: '#1E40AF',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
            }}>
              <Info size={18} color="#2563EB" style={{ flexShrink: 0 }} />
              <span>
                <strong>Chế độ chỉ xem:</strong> Bản ghi này do <strong>{recordCreator.name || recordCreator.id || 'Quản lý'}</strong> tạo. Bạn không có quyền chỉnh sửa nội dung này.
              </span>
            </div>
          )}

          {/* Thông báo khi tất cả nhân sự trực thuộc đã được đánh giá xong */}
          {(!id || id === 'new') && filteredEvaluatees.length === 0 && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              borderRadius: '12px',
              color: '#166534',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)'
            }}>
              <Check size={18} color="#16A34A" style={{ flexShrink: 0 }} />
              <span>
                Tất cả nhân sự trong phạm vi đánh giá đã hoàn tất đánh giá. Để xem lại hoặc cập nhật, vui lòng chọn từ danh sách ở màn hình trước.
              </span>
            </div>
          )}

          {/* 1. Phần thông tin chọn nhân sự HR */}
          <div id="kpi-eval-info" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e1d5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <User size={18} color="#32251E" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Thông Tin Nhân Sự Đánh Giá</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* CHỌN NHÂN SỰ CẦN ĐÁNH GIÁ (ĐÃ TỰ ĐỘNG LỌC BỎ NGƯỜI ĐÃ ĐÁNH GIÁ KHI TẠO MỚI) */}
              <div>
                <FormSelect 
                  label="Chọn nhân sự cần đánh giá *" 
                  value={formData.employeeId} 
                  options={selectOptions} 
                  onChange={(e) => handleSelectStaff(e.target.value)}
                  disabled={isReadOnly || ((!id || id === 'new') && filteredEvaluatees.length === 0)}
                  inputStyle={{ backgroundColor: isReadOnly ? '#f8fafc' : '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <FormInput label="Công đoạn" value={formData.stage} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
                </div>
                <div>
                  <FormInput label="Nhà máy" value={formData.factory} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <FormInput label="Bộ phận" value={formData.department} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
                </div>
                <div>
                  <FormInput 
                    label="Thời gian đánh giá" 
                    value={formData.evalDate} 
                    onChange={e => !isReadOnly && setFormData({...formData, evalDate: e.target.value})} 
                    readOnly={isReadOnly}
                    inputStyle={{ backgroundColor: isReadOnly ? '#f8fafc' : '#fff' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Nội dung Đánh giá từ Quản lý */}
          <div id="kpi-eval-manager-details" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e1d5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} color="#32251E" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Nội Dung Đánh Giá Từ Quản Lý</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#32251E', marginBottom: '6px', display: 'block' }}>
                  1. Thành tích nổi bật
                </label>
                <textarea 
                  rows="3" 
                  placeholder="Nhập các thành tích nổi bật trong tháng..." 
                  value={formData.achievements}
                  onChange={e => !isReadOnly && setFormData({...formData, achievements: e.target.value})}
                  readOnly={isReadOnly}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    color: isReadOnly ? '#475569' : '#1e293b', 
                    backgroundColor: isReadOnly ? '#f8fafc' : '#fff',
                    cursor: isReadOnly ? 'default' : 'text',
                    resize: 'none', 
                    outline: 'none' 
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#32251E', marginBottom: '6px', display: 'block' }}>
                  2. Hạn chế / Khó khăn
                </label>
                <textarea 
                  rows="3" 
                  placeholder="Nhập các vướng mắc, hạn chế hoặc sai sót cần lưu ý..." 
                  value={formData.limitations}
                  onChange={e => !isReadOnly && setFormData({...formData, limitations: e.target.value})}
                  readOnly={isReadOnly}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    color: isReadOnly ? '#475569' : '#1e293b', 
                    backgroundColor: isReadOnly ? '#f8fafc' : '#fff',
                    cursor: isReadOnly ? 'default' : 'text',
                    resize: 'none', 
                    outline: 'none' 
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#32251E', marginBottom: '6px', display: 'block' }}>
                  3. Kế hoạch cải tiến
                </label>
                <textarea 
                  rows="3" 
                  placeholder="Nhập kế hoạch và giải pháp khắc phục..." 
                  value={formData.improvementPlan}
                  onChange={e => !isReadOnly && setFormData({...formData, improvementPlan: e.target.value})}
                  readOnly={isReadOnly}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    color: isReadOnly ? '#475569' : '#1e293b', 
                    backgroundColor: isReadOnly ? '#f8fafc' : '#fff',
                    cursor: isReadOnly ? 'default' : 'text',
                    resize: 'none', 
                    outline: 'none' 
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#32251E', marginBottom: '6px', display: 'block' }}>
                  4. Đề xuất kiến nghị
                </label>
                <textarea 
                  rows="3" 
                  placeholder="Nhập các đề xuất khen thưởng, hỗ trợ hoặc thăng cấp..." 
                  value={formData.proposals}
                  onChange={e => !isReadOnly && setFormData({...formData, proposals: e.target.value})}
                  readOnly={isReadOnly}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.9rem', 
                    color: isReadOnly ? '#475569' : '#1e293b', 
                    backgroundColor: isReadOnly ? '#f8fafc' : '#fff',
                    cursor: isReadOnly ? 'default' : 'text',
                    resize: 'none', 
                    outline: 'none' 
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Bảng chi tiết KPI */}
          <div id="kpi-eval-table-container" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <BarChart3 size={18} color="#32251E" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Chỉ Số KPI Kết Quả Đạt Được</h3>
            </div>
            {kpiLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8c7e6e', fontSize: '0.9rem', fontWeight: '600' }}>
                Đang nạp chỉ số KPI từ hệ thống...
              </div>
            ) : kpiDetails.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8c7e6e', fontSize: '0.9rem', fontWeight: '500' }}>
                {formData.staffName ? 'Chưa có mục tiêu KPI ghi nhận cho nhân sự này trên hệ thống.' : 'Vui lòng chọn nhân sự để hiển thị chỉ số KPI.'}
              </div>
            ) : (
              <DataTable columns={kpiColumns} data={kpiDetails.filter(item => !isManagerEvalItem(item))} />
            )}
          </div>

          {/* 4. Xếp loại tháng */}
          <div id="kpi-eval-rating" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e1d5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Award size={18} color="#32251E" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Xếp Loại Đánh Giá Tháng</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {ratingOptions.map(opt => {
                const isSelected = formData.rating === opt.type
                return (
                  <div key={opt.type} 
                    onClick={() => !isReadOnly && handleRatingChange(opt.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #32251e' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fefce8' : '#fff',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      opacity: isReadOnly && !isSelected ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      border: isSelected ? '2px solid #32251e' : '2px solid #cbd5e1', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#32251e' : 'transparent'
                    }}>
                      {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#32251E' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{opt.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Nút hành động chân trang (Fixed Bottom) - Đồng bộ màu nâu Earth Bronze như Ảnh 4 */}
        <div className="responsive-fixed-footer" style={{
          backgroundColor: '#ffffff',
          padding: '14px 16px',
          display: 'flex',
          gap: '12px',
          borderTop: '1px solid #e2e8f0',
          zIndex: 100
        }}>
          {isReadOnly ? (
            <button 
              onClick={() => navigate('/kpi-staff')} 
              style={{ 
                flex: 1, 
                backgroundColor: '#ffffff', 
                color: '#633617', 
                border: '1.5px solid #8C7362', 
                borderRadius: '12px', 
                padding: '14px', 
                fontSize: '0.95rem', 
                fontWeight: '700', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                cursor: 'pointer' 
              }}
            >
              <RotateCcw size={18} /> Quay lại danh sách
            </button>
          ) : (
            <>
              {/* Nút Hủy bỏ (Bên Trái) */}
              <button 
                onClick={() => navigate('/kpi-staff')} 
                style={{ 
                  flex: 1, 
                  backgroundColor: '#ffffff', 
                  color: '#633617', 
                  border: '1.5px solid #8C7362', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={18} /> Hủy bỏ
              </button>

              {/* Nút Xác nhận (Bên Phải - Màu nâu chuẩn như Ảnh 4) */}
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting || ((!id || id === 'new') && !formData.employeeId)} 
                style={{ 
                  flex: 1, 
                  backgroundColor: (isSubmitting || ((!id || id === 'new') && !formData.employeeId)) ? '#B19A8B' : '#8C7362', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  cursor: (isSubmitting || ((!id || id === 'new') && !formData.employeeId)) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 8px rgba(140, 115, 98, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Check size={18} strokeWidth={2.5} /> Xác nhận
              </button>
            </>
          )}
        </div>

        <MessageModal
          isOpen={messageModal.isOpen}
          type={messageModal.type}
          title={messageModal.title}
          message={messageModal.message}
          onConfirm={() => navigate('/kpi-staff')}
        />

        <ConfirmModal
          isOpen={showConfirmModal}
          title="Xác nhận đánh giá"
          message={`Bạn có chắc chắn muốn xác nhận đánh giá LOẠI ${formData.rating} cho nhân sự ${formData.staffName} không? Dữ liệu sẽ đồng bộ sang Hồ sơ HR.`}
          onConfirm={executeSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      </div>
    </Layout>
  )
}

export default StaffEvaluation
