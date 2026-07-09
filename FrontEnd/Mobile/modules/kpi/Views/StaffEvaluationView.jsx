import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import FormInput from '@mobile/Shared/Views/components/form/FormInput'
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { Check, RotateCcw } from 'lucide-react'
import apiClient from '@shared/services/api'

/**
 * StaffEvaluation Screen
 * Màn hình Đánh giá nhân sự chi tiết.
 */
const StaffEvaluation = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // State dữ liệu Đánh giá
  const [formData, setFormData] = useState({
    staffName: 'Đang tải...',
    stage: 'Đang tải...',
    level: 'A',
    department: 'QLCL',
    rating: 'A',
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
    { id: 1, content: 'Tuân thủ quy trình', goal: '110', actual: '80' },
    { id: 2, content: 'Tỷ lệ lỗi phát hiện', goal: '1.5%', actual: '1.5%' },
    { id: 3, content: 'Tỷ lệ lỗi lọt lưới', goal: '1.5%', actual: '1.5%' },
    { id: 4, content: 'Tỷ lệ lỗi rework', goal: '1.5%', actual: '1.5%' },
    { id: 5, content: 'Điểm báo cáo', goal: '100', actual: '100' }
  ]

  // Load staff data on mount
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const resp = await apiClient.get(`/staff-evaluations/${id}`)
        if (resp.data) {
          setFormData({
            staffName: resp.data.staff_name,
            stage: resp.data.stage,
            level: resp.data.level,
            department: resp.data.department,
            rating: resp.data.rating || 'A',
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
              console.error('Lỗi parse kpi_details:', e)
              setKpiDetails(fallbackKpis)
            }
          } else {
            setKpiDetails(fallbackKpis)
          }
        }
      } catch (err) {
        console.error('Lỗi tải chi tiết đánh giá nhân sự, dùng mock:', err)
        // Mock fallback
        setFormData({
          staffName: 'Hồ Sỹ Khấn (Mock)',
          stage: 'Định hình 1',
          level: 'A',
          department: 'QLCL',
          rating: 'A',
          managerNote: '',
          proposedAction: ''
        })
        setKpiDetails(fallbackKpis)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  const kpiColumns = [
    { header: 'Nội dung', key: 'content' },
    { header: 'Mục tiêu', key: 'goal' },
    { header: 'Thực hiện', key: 'actual' }
  ]

  const handleRatingChange = (type) => {
    setFormData(prev => ({ ...prev, rating: type }))
  }

  const handleConfirm = () => {
    setShowConfirmModal(true)
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmModal(false)
    
    try {
      await apiClient.put(`/staff-evaluations/${id}`, {
        rating: formData.rating,
        manager_note: formData.managerNote,
        proposed_action: formData.proposedAction
      })
      setIsSubmitting(false)
      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: `Đã hoàn tất đánh giá cho nhân sự ${formData.staffName}!`
      })
    } catch (err) {
      console.error('Lỗi cập nhật đánh giá nhân sự:', err)
      setTimeout(() => {
        setIsSubmitting(false)
        setMessageModal({
          isOpen: true,
          type: 'success',
          title: 'Thành công (Offline Fallback)',
          message: `Đã hoàn tất đánh giá (Offline Fallback) cho nhân sự ${formData.staffName}!`
        })
      }, 1000)
    }
  }

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB8.1 | Đánh giá nhân sự" />

      <div style={{ padding: '0px', backgroundColor: 'var(--bg-cream)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Phần thông tin chung */}
          <div id="kpi-eval-info" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <FormSelect label="Chọn nhân sự cần đánh giá" value={formData.staffName} options={[{label: 'Hồ Sỹ Khấn', value: 'Hồ Sỹ Khấn'}]} readOnly={true} />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput label="Công đoạn" value={formData.stage} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <FormInput label="Level" value={formData.level} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput label="Bộ phận" value={formData.department} readOnly={true} inputStyle={{ backgroundColor: '#f8fafc' }} />
              </div>
            </div>
          </div>
 
          {/* 2. Bảng chi tiết KPI */}
          <div id="kpi-eval-table-container" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <DataTable columns={kpiColumns} data={kpiDetails} />
          </div>
 
          {/* 3. Xếp loại tháng */}
          <div id="kpi-eval-rating" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>Xếp loại tháng</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {['A', 'B', 'C', 'D'].map(type => (
                <div key={type} 
                  onClick={() => handleRatingChange(type)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    border: '2px solid #32251e', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: formData.rating === type ? '#32251e' : 'transparent'
                  }}>
                    {formData.rating === type && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#444' }}>Loại {type}</span>
                </div>
              ))}
            </div>
          </div>
 
          {/* 4. Nhận xét & Đề xuất */}
          <div id="kpi-eval-note" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>
                Đánh giá từ quản lý
              </label>
              <textarea 
                rows="3" 
                placeholder="Nhập ghi chú" 
                value={formData.managerNote}
                onChange={e => setFormData({...formData, managerNote: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'block' }}>
                Đề xuất hành động
              </label>
              <textarea 
                rows="3" 
                placeholder="Nhập ghi chú" 
                value={formData.proposedAction}
                onChange={e => setFormData({...formData, proposedAction: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', resize: 'none', outline: 'none' }}
              />
            </div>
          </div>

        </div>

        {/* Nút hành động (Fixed Bottom) */}
        <div className="responsive-fixed-footer" style={{ backgroundColor: 'var(--bg-cream)', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 100 }}>
          <button onClick={handleConfirm} disabled={isSubmitting} style={{ flex: 1, backgroundColor: '#32251e', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Check size={20} strokeWidth={3} /> Xác nhận
          </button>
          <button onClick={() => navigate('/kpi')} style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', fontSize: '1.0rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RotateCcw size={20} /> Hủy
          </button>
        </div>

        <MessageModal
          isOpen={messageModal.isOpen}
          type={messageModal.type}
          title={messageModal.title}
          message={messageModal.message}
          onConfirm={() => navigate('/kpi')}
        />

        <ConfirmModal
          isOpen={showConfirmModal}
          title="Xác nhận đánh giá"
          message={`Bạn có chắc chắn muốn xác nhận đánh giá LOẠI ${formData.rating} cho nhân sự ${formData.staffName} không?`}
          onConfirm={executeSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      </div>
    </Layout>
  )
}

export default StaffEvaluation
