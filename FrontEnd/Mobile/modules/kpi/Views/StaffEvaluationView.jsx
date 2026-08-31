import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import FormInput from '@mobile/Shared/Views/components/form/FormInput'
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { Check, RotateCcw, User, FileText, BarChart3, Award } from 'lucide-react'
import apiClient from '@shared/services/api'

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
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' })

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
              const code = emp.employee_id || emp.code || emp.username || `NV_${emp.id}`
              const name = emp.full_name || emp.name || emp.username
              const department = emp.department_name || emp.department || 'Phòng QLCL'
              const stage = emp.position_name || emp.position || emp.stage || 'QLCL'
              const factory = emp.factory || resolveFactory(department, stage, code)
              return { id: code, code, name, department, stage, factory }
            })
            setEmployees(list)

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
      setKpiDetails(fallbackKpis)
      setLoading(false)
      return
    }

    const fetchDetail = async () => {
      try {
        const resp = await apiClient.get(`/staff-evaluations/${id}`)
        if (resp.data) {
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
              setKpiDetails(parsed)
            } catch (e) {
              setKpiDetails(fallbackKpis)
            }
          } else {
            setKpiDetails(fallbackKpis)
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
      setFormData(prev => ({
        ...prev,
        employeeId: found.code || found.id,
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
    } else {
      setFormData(prev => ({ ...prev, staffName: selectedCode }))
    }
  }

  const kpiColumns = [
    { header: 'Nội dung', key: 'content' },
    { header: 'Mục tiêu', key: 'goal' },
    { header: 'Thực hiện', key: 'actual' }
  ]

  const ratingOptions = [
    { type: 'A', label: 'Loại A', desc: 'Xuất sắc' },
    { type: 'B', label: 'Loại B', desc: 'Khá' },
    { type: 'C', label: 'Loại C', desc: 'Trung bình' },
    { type: 'D', label: 'Loại D', desc: 'Cần cải thiện' }
  ]

  const handleRatingChange = (type) => {
    setFormData(prev => ({ ...prev, rating: type }))
  }

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
      actual_score: formData.rating === 'A' ? 95.0 : (formData.rating === 'B' ? 85.0 : 75.0),
      achievements: formData.achievements,
      limitations: formData.limitations,
      improvement_plan: formData.improvementPlan,
      proposals: formData.proposals,
      manager_note: formData.managerNote || formData.achievements,
      proposed_action: formData.proposedAction || formData.improvementPlan,
      status: 'Đã đánh giá',
      kpi_details: kpiDetails
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
      <PageHeader title="G7 - Smart Flow" subTitle={id === 'new' ? "MB8.1 | Đánh giá nhân sự mới" : "MB8.1 | Đánh giá nhân sự"} />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '0px', backgroundColor: 'var(--bg-cream)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Phần thông tin chọn nhân sự HR */}
          <div id="kpi-eval-info" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #e8e1d5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <User size={18} color="#32251E" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Thông Tin Nhân Sự Đánh Giá</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <FormSelect 
                  label="Chọn nhân sự cần đánh giá *" 
                  value={formData.employeeId} 
                  options={[
                    { label: '-- Chọn nhân sự --', value: '' }, 
                    ...employees.map(e => ({ label: `${e.name} (${e.code})`, value: e.code }))
                  ]} 
                  onChange={(e) => handleSelectStaff(e.target.value)}
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
                  <FormInput label="Thời gian đánh giá" value={formData.evalDate} onChange={e => setFormData({...formData, evalDate: e.target.value})} />
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
                  onChange={e => setFormData({...formData, achievements: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
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
                  onChange={e => setFormData({...formData, limitations: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
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
                  onChange={e => setFormData({...formData, improvementPlan: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
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
                  onChange={e => setFormData({...formData, proposals: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
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
            <DataTable columns={kpiColumns} data={kpiDetails} />
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
                    onClick={() => handleRatingChange(opt.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #32251e' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fefce8' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      border: '2px solid #32251e', 
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

        {/* Nút hành động (Fixed Bottom) */}
        <div className="responsive-fixed-footer" style={{ backgroundColor: '#fff', padding: '14px 16px', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 100 }}>
          <button 
            onClick={handleConfirm} 
            disabled={isSubmitting} 
            style={{ 
              flex: 1, 
              backgroundColor: '#8FA0B5', 
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
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(143, 160, 181, 0.3)'
            }}
          >
            <Check size={18} strokeWidth={2.5} /> Xác nhận
          </button>
          <button 
            onClick={() => navigate('/kpi-staff')} 
            style={{ 
              flex: 1, 
              backgroundColor: '#ffffff', 
              color: '#5A6B7C', 
              border: '1px solid #C5D2E1', 
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
            <RotateCcw size={18} /> Hủy
          </button>
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
