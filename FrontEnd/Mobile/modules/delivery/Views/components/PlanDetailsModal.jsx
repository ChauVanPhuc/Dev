import { useState, useEffect } from 'react'

import { X, Info, AlertCircle, Search } from 'lucide-react'

import { usePlanController } from '@modules/production/Controllers/planController'

import useAuthStore from '@modules/auth/Models/authModel'

import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard'



/**

 * PlanDetailsModal - Hiển thị nhanh danh sách PO và sản phẩm của KHSX

 * Hỗ trợ phân trang (5 POs/trang) và thanh tìm kiếm PO/Sản phẩm để tối ưu tốc độ.

 */

const PlanDetailsModal = ({ isOpen, onClose, planId }) => {

  const { fetchPlanDetail, loading } = usePlanController()

  const { user } = useAuthStore()

  const [planData, setPlanData] = useState(null)

  const [errorMsg, setErrorMsg] = useState('')

  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 5



  const userStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || ''



  useEffect(() => {

    if (isOpen && planId) {

      setErrorMsg('')

      setSearchQuery('')

      setCurrentPage(1)

      fetchPlanDetail(planId, null, userStage, true)

        .then(data => {

          if (data) {

            setPlanData(data)

          } else {

            setErrorMsg('Không thể tải thông tin kế hoạch.')

          }

        })

        .catch(err => {

          console.error(err)

          setErrorMsg('Lỗi kết nối hệ thống khi tải kế hoạch.')

        })

    }

  }, [isOpen, planId, fetchPlanDetail, userStage])



  // Reset về trang 1 khi từ khóa tìm kiếm thay đổi

  useEffect(() => {

    setCurrentPage(1)

  }, [searchQuery])



  if (!isOpen) return null



  // Lọc PO & sản phẩm dựa trên từ khóa tìm kiếm

  const filteredOrders = (planData?.orders || []).filter(order => {

    const q = searchQuery.toLowerCase().trim()

    if (!q) return true



    // Tìm theo tên PO

    if (order.name && order.name.toLowerCase().includes(q)) return true



    // Tìm theo mã sản phẩm hoặc tên sản phẩm bên trong PO

    const hasMatchingProduct = (order.products || []).some(prod =>

      (prod.sku && prod.sku.toLowerCase().includes(q)) ||

      (prod.name && prod.name.toLowerCase().includes(q))

    )

    return hasMatchingProduct

  })



  // Tính toán phân trang

  const totalItems = filteredOrders.length

  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const startIndex = (currentPage - 1) * pageSize

  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize)



  return (

    <>

      {/* Overlay mờ phía sau */}

      <div

        onClick={onClose}

        style={{

          position: 'fixed',

          inset: 0,

          background: 'rgba(0,0,0,0.6)',

          zIndex: 9998,

          backdropFilter: 'blur(3px)'

        }}

      />



      {/* Container Modal dạng thẻ nổi bo tròn góc đầy đủ cho Mobile */}

      <div

        style={{

          position: 'fixed',

          bottom: '16px',

          left: '50%',

          transform: 'translateX(-50%)',

          width: 'calc(100% - 32px)',

          maxWidth: '468px',

          maxHeight: 'calc(100dvh - 32px)',
          height: '80vh',

          background: '#f8fafc',

          borderRadius: '28px',

          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',

          zIndex: 9999,

          display: 'flex',

          flexDirection: 'column',

          overflow: 'hidden',

          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'

        }}

      >

        <style dangerouslySetInnerHTML={{

          __html: `

          @keyframes slideUp {

            from { transform: translate(-50%, 100%); }

            to { transform: translate(-50%, 0); }

          }

        `}} />



        {/* Header Modal */}

        <div style={{

          padding: '20px 24px 16px',

          borderBottom: '1px solid #e2e8f0',

          display: 'flex',

          justifyContent: 'space-between',

          alignItems: 'center',

          backgroundColor: '#fff'

        }}>

          <div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>

              Kế hoạch sản xuất

            </h3>

            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0', fontWeight: '600' }}>

              {planData?.name || 'Đang tải...'}

            </p>

          </div>

          <button

            onClick={onClose}

            style={{

              width: '36px',

              height: '36px',

              borderRadius: '50%',

              border: 'none',

              backgroundColor: '#f1f5f9',

              color: '#64748b',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              cursor: 'pointer'

            }}

          >

            <X size={18} strokeWidth={2.5} />

          </button>

        </div>



        {/* Search Bar - Chỉ hiện khi tải xong dữ liệu và không bị lỗi */}

        {!loading && !errorMsg && planData?.orders?.length > 0 && (

          <div style={{ padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

              <span style={{ position: 'absolute', left: '14px', color: '#94a3b8', display: 'flex' }}>

                <Search size={18} />

              </span>

              <input

                type="text"

                value={searchQuery}

                onChange={e => setSearchQuery(e.target.value)}

                placeholder="Tìm kiếm PO hoặc sản phẩm..."

                style={{

                  width: '100%',

                  padding: '10px 14px 10px 42px',

                  borderRadius: '24px',

                  border: '1px solid #cbd5e1',

                  fontSize: '0.9rem',

                  outline: 'none',

                  backgroundColor: '#f8fafc',

                  color: '#334155',

                  fontWeight: '600',

                  boxSizing: 'border-box'

                }}

              />

              {searchQuery && (

                <button

                  onClick={() => setSearchQuery('')}

                  style={{

                    position: 'absolute',

                    right: '12px',

                    border: 'none',

                    background: 'none',

                    color: '#94a3b8',

                    cursor: 'pointer',

                    display: 'flex',

                    padding: '4px'

                  }}

                >

                  <X size={16} />

                </button>

              )}

            </div>

          </div>

        )}



        {/* Body Modal - Scrollable */}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: 'var(--bg-cream)' }}>

          {loading ? (

            <div style={{ textAlign: 'center', padding: '40px' }}>

              <div style={{

                border: '4px solid #f3f3f3',

                borderTop: '4px solid var(--primary-color)',

                borderRadius: '50%',

                width: '30px',

                height: '30px',

                animation: 'spin 1s linear infinite',

                margin: '0 auto 12px'

              }} />

              <style dangerouslySetInnerHTML={{

                __html: `

                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

              `}} />

              <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Đang tải dữ liệu KHSX...</p>

            </div>

          ) : errorMsg ? (

            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #fed7d7' }}>

              <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }} />

              <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: '700' }}>{errorMsg}</p>

            </div>

          ) : !planData?.orders || planData.orders.length === 0 ? (

            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>

              <Info size={32} color="#94a3b8" style={{ marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }} />

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Kế hoạch không có đơn hàng nào.</p>

            </div>

          ) : filteredOrders.length === 0 ? (

            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>

              <Info size={32} color="#94a3b8" style={{ marginBottom: '12px', marginLeft: 'auto', marginRight: 'auto' }} />

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Không tìm thấy đơn hàng hoặc sản phẩm trùng khớp.</p>

            </div>

          ) : (

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {paginatedOrders.map(order => {

                return (

                  <CollapsibleCard

                    key={order.id}

                    title={order.name}

                    defaultOpen={false}

                  >

                    <div style={{ overflowX: 'auto' }}>

                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>

                        <thead>

                          <tr style={{ borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>

                            <th style={{ padding: '8px 4px', fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>Mã SP</th>

                            <th style={{ padding: '8px 4px', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textAlign: 'center', width: '80px' }}>KH</th>

                          </tr>

                        </thead>

                        <tbody>

                          {(order.products || []).map(prod => {

                            return (

                              <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>

                                <td style={{ padding: '10px 4px', fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>

                                  {prod.sku || prod.name || '---'}

                                </td>

                                <td style={{ padding: '10px 4px', fontSize: '0.8rem', fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>

                                  {prod.quantity || 0}

                                </td>

                              </tr>

                            )

                          })}

                        </tbody>

                      </table>

                    </div>

                  </CollapsibleCard>

                )

              })}



              {/* Pagination Controls */}

              {totalPages > 1 && (

                <div style={{

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  gap: '16px',

                  marginTop: '16px',

                  padding: '8px 0'

                }}>

                  <button

                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}

                    disabled={currentPage === 1}

                    style={{

                      padding: '8px 16px',

                      borderRadius: '8px',

                      border: '1px solid #cbd5e1',

                      backgroundColor: currentPage === 1 ? '#e2e8f0' : '#fff',

                      color: currentPage === 1 ? '#94a3b8' : '#334155',

                      fontWeight: '700',

                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',

                      fontSize: '0.85rem'

                    }}

                  >

                    Trước

                  </button>

                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#475569' }}>

                    {currentPage} / {totalPages}

                  </span>

                  <button

                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}

                    disabled={currentPage === totalPages}

                    style={{

                      padding: '8px 16px',

                      borderRadius: '8px',

                      border: '1px solid #cbd5e1',

                      backgroundColor: currentPage === totalPages ? '#e2e8f0' : '#fff',

                      color: currentPage === totalPages ? '#94a3b8' : '#334155',

                      fontWeight: '700',

                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',

                      fontSize: '0.85rem'

                    }}

                  >

                    Sau

                  </button>

                </div>

              )}

            </div>

          )}

        </div>

      </div>

    </>

  )

}



export default PlanDetailsModal

