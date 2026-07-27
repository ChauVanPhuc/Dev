import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import { Plus, X, ChevronDown, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Camera, Image as ImageIcon } from 'lucide-react'
import apiClient from '@shared/services/api'

/**
 * AwardDiscipline Screen (CL13 — Báo cáo vi phạm)
 * Thiết kế mới: Danh sách + modal thêm mới + tabs + phân trang.
 */
const AwardDiscipline = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // Data states
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  // Filter states
  const [activeTab, setActiveTab] = useState('pending') // pending | history
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', title: '', message: '' })

  // Form data
  const [formData, setFormData] = useState({
    staff: '',
    issue: '',
    description: '',
    note: '',
    points: ''
  })

  // Options from API
  const [staffOptions, setStaffOptions] = useState([])
  const [rulesList, setRulesList] = useState([])
  const [issueOptions, setIssueOptions] = useState([])

  const months = [
    { label: 'Tháng 1', value: 1 }, { label: 'Tháng 2', value: 2 },
    { label: 'Tháng 3', value: 3 }, { label: 'Tháng 4', value: 4 },
    { label: 'Tháng 5', value: 5 }, { label: 'Tháng 6', value: 6 },
    { label: 'Tháng 7', value: 7 }, { label: 'Tháng 8', value: 8 },
    { label: 'Tháng 9', value: 9 }, { label: 'Tháng 10', value: 10 },
    { label: 'Tháng 11', value: 11 }, { label: 'Tháng 12', value: 12 },
  ]

  // Fetch violations list
  const fetchViolations = useCallback(async () => {
    setLoading(true)
    try {
      const statusFilter = activeTab === 'pending' ? 'pending' : null
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(new Date().getFullYear()),
        skip: String((currentPage - 1) * pageSize),
        limit: String(pageSize)
      })
      if (statusFilter) params.set('status', statusFilter)

      const resp = await apiClient.get(`/awards-discipline/?${params.toString()}`)
      const data = resp.data || resp
      setViolations(data.items || [])
      setTotalItems(data.total || 0)
    } catch (err) {
      console.error('Lỗi khi tải danh sách vi phạm:', err)
      setViolations([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedMonth, currentPage])

  // Fetch stats (pending count)
  const fetchStats = useCallback(async () => {
    try {
      const resp = await apiClient.get(`/awards-discipline/stats?month=${selectedMonth}&year=${new Date().getFullYear()}`)
      const data = resp.data || resp
      setPendingCount(data.pending || 0)
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err)
    }
  }, [selectedMonth])

  // Fetch staff and rules for form dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const staffResp = await apiClient.get('/kpi-management/employees')
        const staffData = staffResp.data || staffResp
        if (Array.isArray(staffData) && staffData.length > 0) {
          setStaffOptions(staffData.map(item => ({
            label: item.full_name,
            value: item.full_name,
            employee_id: item.employee_id,
            department: item.department,
            position: item.position
          })))
        }
      } catch (err) {
        console.error('Lỗi khi tải nhân sự:', err)
      }

      try {
        const rulesResp = await apiClient.get('/kpi-management/point-rules')
        const rulesData = rulesResp.data || rulesResp
        if (Array.isArray(rulesData) && rulesData.length > 0) {
          setRulesList(rulesData)
          setIssueOptions(rulesData.map(item => ({
            label: item.content,
            value: item.content,
            rule_code: item.rule_code,
            points: item.points,
            impact: item.impact
          })))
        }
      } catch (err) {
        console.error('Lỗi khi tải điều luật:', err)
      }
    }
    fetchDropdowns()
  }, [])

  useEffect(() => {
    fetchViolations()
    fetchStats()
  }, [fetchViolations, fetchStats])

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, selectedMonth])

  const handleFormChange = (name, value) => {
    if (name === 'issue') {
      const selectedRule = issueOptions.find(r => r.value === value)
      if (selectedRule) {
        setFormData(prev => ({
          ...prev,
          issue: value,
          points: String(Math.abs(selectedRule.points))
        }))
        return
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddPhoto = () => {
    if (photos.length < 3 && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && photos.length < 3) {
      setPhotos([...photos, { id: Date.now(), url: URL.createObjectURL(file), file }])
    }
    if (e.target) e.target.value = null
  }

  const handleRemovePhoto = (id) => setPhotos(photos.filter(p => p.id !== id))

  const resetForm = () => {
    setFormData({ staff: '', issue: '', description: '', note: '', points: '' })
    setPhotos([])
  }

  const handleSubmit = () => setShowConfirmModal(true)

  const executeSubmit = async () => {
    setIsSubmitting(true)
    setShowConfirmModal(false)

    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} | ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    const selectedStaff = staffOptions.find(s => s.value === formData.staff)
    const selectedRule = issueOptions.find(r => r.value === formData.issue)

    const payload = {
      staff_name: formData.staff,
      issue: formData.issue,
      note: formData.note,
      impact: selectedRule?.impact || 'Trung bình',
      points: parseInt(formData.points) || 0,
      date: formattedDate,
      evidence_images: JSON.stringify(photos.map(p => p.url)),
      rule_code: selectedRule?.rule_code || '',
      rule_name: formData.issue,
      severity: selectedRule?.impact || 'Trung bình',
      employee_id: selectedStaff?.employee_id || '',
      department: selectedStaff?.department || '',
      position: selectedStaff?.position || '',
      violation_time: formattedTime,
      reporter_name: JSON.parse(localStorage.getItem('smartflow_user') || '{}').full_name || 'Hệ thống',
      description: formData.description,
      status: 'pending'
    }

    try {
      await apiClient.post('/awards-discipline/', payload)
      setIsSubmitting(false)
      setShowAddModal(false)
      resetForm()
      setMessageModal({ isOpen: true, type: 'success', title: 'Thành công', message: 'Đã tạo báo cáo vi phạm thành công!' })
      fetchViolations()
      fetchStats()
    } catch (err) {
      console.error('Lỗi khi tạo vi phạm:', err)
      setIsSubmitting(false)
      setMessageModal({ isOpen: true, type: 'error', title: 'Lỗi', message: 'Không thể tạo báo cáo. Vui lòng thử lại.' })
    }
  }

  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { text: 'Chưa duyệt', color: '#d97706', bg: '#fef3c7' }
      case 'tracking': return { text: 'Đang theo dõi', color: '#2563eb', bg: '#dbeafe' }
      case 'approved': return { text: 'Đã duyệt', color: '#16a34a', bg: '#dcfce7' }
      case 'rejected': return { text: 'Từ chối', color: '#dc2626', bg: '#fee2e2' }
      default: return { text: 'Vừa tạo', color: '#7B5233', bg: '#faf4ee' }
    }
  }

  return (
    <Layout>
      <PageHeader title="Báo cáo vi phạm" subTitle="CL13: Danh sách vi phạm" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#faf6f1', position: 'relative' }}>

        {/* Toolbar */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e0d8' }}>
          {/* Month Picker */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #d4c5b0', backgroundColor: '#fff',
                fontSize: '0.85rem', fontWeight: '700', color: '#5d3b32',
                cursor: 'pointer', width: '100%', justifyContent: 'space-between'
              }}
            >
              <span>Tháng {selectedMonth}</span>
              <ChevronDown size={16} />
            </button>
            {showMonthPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '4px',
                backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                boxShadow: '0 8px 16px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto'
              }}>
                {months.map(m => (
                  <button
                    key={m.value}
                    onClick={() => { setSelectedMonth(m.value); setShowMonthPicker(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 12px', border: 'none',
                      backgroundColor: selectedMonth === m.value ? '#faf4ee' : '#fff',
                      color: selectedMonth === m.value ? '#5d3b32' : '#333',
                      fontWeight: selectedMonth === m.value ? '800' : '500',
                      fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort & Filter */}
          <button style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d4c5b0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowUpDown size={18} color="#5d3b32" />
          </button>
          <button style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d4c5b0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <SlidersHorizontal size={18} color="#5d3b32" />
          </button>

          {/* Add New Button */}
          <button
            onClick={() => { resetForm(); setShowAddModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              backgroundColor: '#5d3b32', color: '#fff',
              fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Plus size={16} strokeWidth={3} /> Thêm mới
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e0d8' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', backgroundColor: 'transparent',
              fontSize: '0.85rem', fontWeight: activeTab === 'pending' ? '800' : '600',
              color: activeTab === 'pending' ? '#5d3b32' : '#888',
              borderBottom: activeTab === 'pending' ? '3px solid #5d3b32' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            Chưa duyệt
            {pendingCount > 0 && (
              <span style={{
                backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: '900'
              }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', backgroundColor: 'transparent',
              fontSize: '0.85rem', fontWeight: activeTab === 'history' ? '800' : '600',
              color: activeTab === 'history' ? '#5d3b32' : '#888',
              borderBottom: activeTab === 'history' ? '3px solid #5d3b32' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Lịch sử báo cáo
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '700' }}>
              Đang tải dữ liệu...
            </div>
          ) : violations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' }}>
              Không có vi phạm nào.
            </div>
          ) : (
            violations.map(item => {
              const statusInfo = getStatusLabel(item.status)
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#fff', borderRadius: '12px', padding: '14px 16px',
                    border: '1px solid #e8e0d4',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b', letterSpacing: '0.5px' }}>
                      {item.rule_code || 'VP-' + String(item.id).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#666', fontWeight: '600' }}>
                      {item.violation_time || item.date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
                      Xử lý bởi: {item.reporter_name || item.staff_name}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '700',
                      color: statusInfo.color,
                      backgroundColor: statusInfo.bg,
                      padding: '3px 10px', borderRadius: '6px'
                    }}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="responsive-fixed-footer" style={{
            padding: '12px 16px', borderTop: '1px solid #e5e0d8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#fff',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.04)'
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #d4c5b0',
                backgroundColor: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              <ChevronLeft size={18} color="#5d3b32" />
            </button>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
              Hiển thị {startItem} đến{' '}
              <input
                type="number"
                value={endItem}
                readOnly
                style={{
                  width: '36px', textAlign: 'center', border: '1px solid #d4c5b0',
                  borderRadius: '4px', padding: '2px 4px', fontSize: '0.82rem',
                  fontWeight: '700', color: '#5d3b32'
                }}
              />
              {' '}trên {totalItems} kết quả
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #d4c5b0',
                backgroundColor: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentPage === totalPages ? 0.4 : 1
              }}
            >
              <ChevronRight size={18} color="#5d3b32" />
            </button>
          </div>
        )}
        {/* === MODAL: Thêm vi phạm (CL13.1) === */}}
      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
              zIndex: 10000
            }}
          />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: '90%', maxWidth: '400px',
            backgroundColor: '#fff', zIndex: 10001,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            animation: 'slideInRight 0.25s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #e5e7eb'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
                CL13.1: Thêm vi phạm
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} color="#64748b" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Tên nhân sự + Thời gian */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Tên nhân sự <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={formData.staff}
                    onChange={(e) => handleFormChange('staff', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                      backgroundColor: '#fff', color: '#1e293b', boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Chọn nhân sự</option>
                    {staffOptions.map((opt, idx) => (
                      <option key={opt.employee_id || idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Thời gian ghi nhận
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                      backgroundColor: '#f8fafc', color: '#64748b', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Nội dung vi phạm + Điểm */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Nội dung vi phạm <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={formData.issue}
                    onChange={(e) => handleFormChange('issue', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                      backgroundColor: '#fff', color: '#1e293b', boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Chọn nội dung</option>
                    {issueOptions.map((opt, idx) => (
                      <option key={opt.rule_code || idx} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Điểm
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.points}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                      backgroundColor: '#f8fafc', color: '#64748b', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Mô tả
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Ghi chú */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Ghi chú
                </label>
                <textarea
                  placeholder="Nhập ghi chú"
                  value={formData.note}
                  onChange={(e) => handleFormChange('note', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Thêm ảnh */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                onClick={handleAddPhoto}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', color: '#2563eb',
                  fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                  padding: '4px 0', marginBottom: '12px'
                }}
              >
                <Plus size={16} strokeWidth={3} /> Thêm ảnh
              </button>

              {/* Preview ảnh */}
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {photos.map(photo => (
                    <div key={photo.id} style={{
                      width: '60px', height: '60px', borderRadius: '8px',
                      position: 'relative', overflow: 'hidden', border: '1px solid #e2e8f0'
                    }}>
                      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => handleRemovePhoto(photo.id)}
                        style={{
                          position: 'absolute', top: '2px', right: '2px',
                          background: '#fff', borderRadius: '50%', border: 'none',
                          width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                      >
                        <X size={10} color="#ef4444" strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px', borderTop: '1px solid #e5e7eb',
              display: 'flex', gap: '12px'
            }}>
              <button
                onClick={() => { setShowAddModal(false); resetForm() }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', backgroundColor: '#fff',
                  color: '#64748b', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                Xóa
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.staff || !formData.issue}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: 'none', backgroundColor: (!formData.staff || !formData.issue) ? '#94a3b8' : '#7c2d12',
                  color: '#fff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Modals */}
      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => setMessageModal({ ...messageModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Xác nhận tạo báo cáo"
        message="Bạn có chắc chắn muốn tạo báo cáo vi phạm này không?"
        onConfirm={executeSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />

      {/* Animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </Layout>
  )
}

export default AwardDiscipline
