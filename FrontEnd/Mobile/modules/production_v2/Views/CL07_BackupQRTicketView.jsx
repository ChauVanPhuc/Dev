import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Truck, ClipboardCheck, ScanLine, RefreshCw } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import Tabs from '@mobile/Shared/Views/components/ui/Tabs'
import CL07_TransferCreateView from './CL07_TransferCreateView'
import CL09A_FirstSampleView from './CL09A_FirstSampleView'
import apiClient from '@shared/services/api'
import '../styles/production_v2.css'

const CL07_BackupQRTicketView = () => {
  const { code: paramCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const backupCode = (paramCode || location.state?.backupQrCode || '').trim().toUpperCase()

  const [activeTab, setActiveTab] = useState('handover') // 'handover' | 'inspection'
  const [loading, setLoading] = useState(true)
  const [qrStatus, setQrStatus] = useState(null)

  // Tải thông tin trạng thái của Thẻ Dự Phòng
  const loadQrData = useCallback(async () => {
    if (!backupCode) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.get(`deliveries/by-backup-qr/${encodeURIComponent(backupCode)}`)
      setQrStatus(res.data || {})
    } catch (e) {
      console.warn('Lỗi khi tải thông tin mã dự phòng:', e)
      setQrStatus(null)
    } finally {
      setLoading(false)
    }
  }, [backupCode])

  useEffect(() => {
    loadQrData()
  }, [loadQrData])

  useEffect(() => {
    if (qrStatus?.current_inspection_id && !qrStatus?.current_delivery_id) {
      setActiveTab('inspection')
    }
  }, [qrStatus])

  const tabsConfig = [
    { id: 'handover', label: 'Bàn giao', icon: Truck },
    { id: 'inspection', label: 'Kiểm tra', icon: ClipboardCheck }
  ]

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Mã Dự Phòng" subTitle={`Thẻ: ${backupCode}`} showBack={true} />
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={28} className="pv2-spin" style={{ margin: '0 auto 12px' }} />
          <div>Đang nạp thông tin Thẻ dự phòng {backupCode}...</div>
        </div>
      </Layout>
    )
  }

  const isUsing = qrStatus?.status === 'Đang Sử Dụng'

  return (
    <Layout>
      <PageHeader
        title="Thẻ Luân Chuyển Dự Phòng"
        subTitle={`Mã thẻ: ${backupCode}`}
        showBack={true}
      />

      {/* Header Tabs & Backup QR Banner */}
      <div style={{
        padding: '8px 12px 0 12px',
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Banner hiển thị mã dự phòng */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '8px',
          color: '#92400e',
          fontWeight: '700',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanLine size={20} color="#b45309" />
            <span>Thẻ dự phòng: <strong style={{ color: '#78350f' }}>{backupCode}</strong></span>
          </div>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: isUsing ? '#dcfce7' : '#e0e7ff',
            color: isUsing ? '#166534' : '#3730a3',
            fontWeight: 800
          }}>
            {isUsing ? 'Đang Sử Dụng' : 'Thẻ Trống'}
          </span>
        </div>

        {/* 2 Tab chuyển đổi: Bàn giao & Kiểm tra */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '4px 8px',
          marginBottom: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <Tabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
          />
        </div>
      </div>

      {/* Gọi trực tiếp trang Bàn Giao gốc hoặc Kiểm Tra gốc để giao diện chuẩn 100% */}
      {activeTab === 'handover' ? (
        <CL07_TransferCreateView
          embedded={true}
          backupQrCode={backupCode}
          deliveryId={qrStatus?.current_delivery_id || undefined}
        />
      ) : (
        <CL09A_FirstSampleView
          embedded={true}
          inspectionId={qrStatus?.current_inspection_id || undefined}
          backupQrCode={backupCode}
        />
      )}
    </Layout>
  )
}

export default CL07_BackupQRTicketView
