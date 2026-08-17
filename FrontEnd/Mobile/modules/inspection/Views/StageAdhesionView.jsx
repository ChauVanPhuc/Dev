import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import FormInput from '@mobile/Shared/Views/components/form/FormInput';
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import SearchableSelect from '@mobile/Shared/Views/components/form/SearchableSelect';
import PassFailSelector from '@mobile/Shared/Views/components/ui/PassFailSelector';
import InspectionDetailPopup, { formatDateTime, getTypeName } from './components/InspectionDetailPopup';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import apiClient, { API_ROOT } from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const root = API_ROOT.endsWith('/') ? API_ROOT.slice(0, -1) : API_ROOT;
  return `${root}${cleanPath}`;
};

const StageAdhesionView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logId } = location.state || {};
  const { user } = useAuthStore();
  const inspectionType = 'bam-dinh';

  const fileInputRef = useRef(null);
  const [activeDetailIndex, setActiveDetailIndex] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleTriggerCapture = (idx) => {
    setActiveDetailIndex(idx);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || activeDetailIndex === null) return;
    const file = files[0];
    
    const localUrl = URL.createObjectURL(file);
    setDetailsList(prev => {
      const next = [...prev];
      if (next[activeDetailIndex]) {
        next[activeDetailIndex].image = localUrl;
      }
      return next;
    });

    try {
      setIsUploadingPhoto(true);
      const formDataUpload = new FormData();
      formDataUpload.append('files', file);
      const res = await apiClient.post('inspections/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.paths && res.data.paths.length > 0) {
        const serverPath = res.data.paths[0];
        setDetailsList(prev => {
          const next = [...prev];
          if (next[activeDetailIndex]) {
            next[activeDetailIndex].image = serverPath;
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Lỗi khi upload ảnh bám dính:", err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    batch_no: '',
    product_sku: '',
    notes: '',
    action: 'luu-kho'
  });
  const [detailsList, setDetailsList] = useState([]);

  const [currentProducts, setCurrentProducts] = useState([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [recentPOs, setRecentPOs] = useState([]);

  // Fetch PO options
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await apiClient.get('orders/?limit=100');
        if (res.data && Array.isArray(res.data)) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải PO:", err);
      }
    };
    fetchPOs();
  }, []);

  // Fetch products under selected PO
  useEffect(() => {
    if (!formData.batch_no) {
      setCurrentProducts([]);
      return;
    }
    const fetchPOProducts = async () => {
      setIsProductLoading(true);
      try {
        const uniqueItems = [];
        const seen = new Set();

        // 1. Try fetching from Sales Orders endpoint (which returns BOM elements)
        try {
          const res1 = await apiClient.get(`orders/by-code/${formData.batch_no}/products`);
          const productsData = res1.data || {};
          if (Array.isArray(productsData.products)) {
            productsData.products.forEach(p => {
              if (!seen.has(p.sku)) {
                seen.add(p.sku);
                uniqueItems.push({ sku: p.sku, name: p.name, elements: p.elements || [] });
              }
            });
          }
          if (Array.isArray(productsData.items)) {
            productsData.items.forEach(it => {
              if (!seen.has(it.sku)) {
                seen.add(it.sku);
                uniqueItems.push({ sku: it.sku, name: it.name, elements: [] });
              }
            });
          }
        } catch (e) {
          console.log('Not a sales order, skipping SO BOM fetch.');
        }

        // 2. Try fetching from Purchase Orders endpoint
        try {
          const res2 = await apiClient.get(`purchase-order-items/by-po/${formData.batch_no}`);
          if (Array.isArray(res2.data)) {
            res2.data.forEach(item => {
              if (!seen.has(item.item_code)) {
                seen.add(item.item_code);
                uniqueItems.push({ sku: item.item_code, name: item.item_name, elements: [] });
              }
            });
          }
        } catch (e) {
          console.log('Not a purchase order, skipping PO items fetch.');
        }

        setCurrentProducts(uniqueItems);
        
        // Auto select first product if not editing
        if (!logId && uniqueItems.length > 0) {
          setFormData(prev => ({
            ...prev,
            product_sku: uniqueItems[0].sku
          }));
        }
        
      } catch (err) {
        console.error("Lỗi tải sản phẩm BOM:", err);
      } finally {
        setIsProductLoading(false);
      }
    };
    fetchPOProducts();
  }, [formData.batch_no]);

  // Fetch History
  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await apiClient.get('inspections/stage?limit=50');
      if (Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const saved = JSON.parse(localStorage.getItem('recent_stage_po_searches') || '[]');
    setRecentPOs(saved);
  }, []);

  // Load old data if editing
  useEffect(() => {
    if (!logId) return;
    const fetchOldData = async () => {
      try {
        const res = await apiClient.get(`inspections/stage/${logId}`);
        if (res.data) {
          const item = res.data;
          let extra = {};
          try {
            extra = typeof item.data_json === 'string' ? JSON.parse(item.data_json) : (item.data_json || {});
          } catch (e) {}

          setFormData({
            batch_no: item.batch_no || '',
            product_sku: item.product_sku || '',
            notes: item.notes || '',
            action: extra.action || 'luu-kho'
          });
          setDetailsList(extra.detailsList || []);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu cũ:", err);
      }
    };
    fetchOldData();
  }, [logId]);

  const productOptions = useMemo(() => {
    if (isProductLoading) return [{ label: 'Đang tải...', value: '' }];
    if (currentProducts.length === 0) return [{ label: 'Chọn PO trước', value: '' }];
    return currentProducts.map(p => ({ label: p.sku, value: p.sku }));
  }, [currentProducts, isProductLoading]);

  useEffect(() => {
    if (!logId) {
      if (formData.product_sku) {
        // Process elements to remove 'ván ghép' and deduplicate by name
        const processElements = (rawElements) => {
          const uniqueNames = new Set();
          const processedList = [];
          
          rawElements.forEach((el) => {
            const elName = el.name || '';
            const nameLower = elName.toLowerCase();
            
            // Bỏ qua các loại ván
            if (nameLower.includes('ván ghép') || 
                nameLower.includes('ván ép') || 
                nameLower.includes('ván mdf')) return;
            
            if (!uniqueNames.has(elName)) { // Gộp chung
              uniqueNames.add(elName);
              processedList.push({
                id: Date.now() + processedList.length,
                name: elName,
                conclusion: 'pass',
                image: null
              });
            }
          });
          return processedList;
        };

        const selectedProd = currentProducts.find(p => p.sku === formData.product_sku);
        if (selectedProd && Array.isArray(selectedProd.elements) && selectedProd.elements.length > 0) {
          setDetailsList(processElements(selectedProd.elements));
        } else {
          // Attempt to fetch from master-products if not in PO elements
          const fetchMasterBOM = async () => {
            try {
              const res = await apiClient.get(`master-products/?q=${formData.product_sku}`);
              if (res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
                const match = res.data.items.find(i => i.sku === formData.product_sku);
                if (match) {
                  const detailRes = await apiClient.get(`master-products/${match.id}`);
                  if (detailRes.data && Array.isArray(detailRes.data.master_bom_details) && detailRes.data.master_bom_details.length > 0) {
                    setDetailsList(processElements(detailRes.data.master_bom_details));
                    return;
                  }
                }
              }
              // Fallback
              setDetailsList([
                { id: Date.now(), name: selectedProd ? (selectedProd.name || selectedProd.sku) : formData.product_sku, conclusion: 'pass', image: null }
              ]);
            } catch (err) {
              setDetailsList([
                { id: Date.now(), name: selectedProd ? (selectedProd.name || selectedProd.sku) : formData.product_sku, conclusion: 'pass', image: null }
              ]);
            }
          };
          fetchMasterBOM();
        }
      } else {
        setDetailsList([]);
      }
    }
  }, [formData.product_sku, logId, currentProducts]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      const allPhotos = detailsList.map(d => d.image).filter(Boolean);
      const payload = {
        inspection_type: inspectionType,
        batch_no: formData.batch_no,
        product_sku: formData.product_sku,
        inspector_name: user?.full_name || "Người kiểm tra",
        conclusion: detailsList.some(d => d.conclusion === 'fail') ? 'fail' : 'pass',
        notes: formData.notes,
        data_json: JSON.stringify({
          detailsList: detailsList,
          action: formData.action
        }),
        images_json: JSON.stringify({ 'Ảnh bám dính': allPhotos })
      };

      if (logId) {
        await apiClient.post(`inspections/stage/${logId}`, payload);
      } else {
        await apiClient.post('inspections/stage', payload);
      }

      setMessageConfig({
        type: 'success',
        title: 'Thành công',
        message: 'Lưu phiếu kiểm tra bám dính thành công!'
      });
      setIsMessageOpen(true);
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setMessageConfig({
        type: 'error',
        title: 'Thất bại',
        message: 'Có lỗi xảy ra khi lưu phiếu. Vui lòng thử lại!'
      });
      setIsMessageOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => item.inspection_type === 'bam-dinh').slice(0, 3);
  }, [historyList]);

  return (
    <Layout>
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment" 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />
      <div style={{ backgroundColor: 'var(--bg-cream)', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB22 | Kiểm tra bám dính" />

        {/* 1. PO Search Block */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <SearchableSelect
            label="PO (Lệnh SX)"
            value={formData.batch_no}
            options={orders.map(o => ({ label: o.order_code, value: o.order_code }))}
            onChange={(e) => {
              const val = e.target.value;
              handleFieldChange('batch_no', val);
              if (val) {
                let list = JSON.parse(localStorage.getItem('recent_stage_po_searches') || '[]');
                list = [val, ...list.filter(x => x !== val)].slice(0, 5);
                localStorage.setItem('recent_stage_po_searches', JSON.stringify(list));
                setRecentPOs(list);
              }
            }}
            placeholder="Tìm mã PO..."
          />
          {recentPOs.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {recentPOs.map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    handleFieldChange('batch_no', code);
                    let list = JSON.parse(localStorage.getItem('recent_stage_po_searches') || '[]');
                    list = [code, ...list.filter(x => x !== code)].slice(0, 5);
                    localStorage.setItem('recent_stage_po_searches', JSON.stringify(list));
                    setRecentPOs(list);
                  }}
                  style={{ padding: '4px 10px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Form Thông tin kiểm tra */}
        <div id="stage-form-card">
          <CollapsibleCard title="Thông tin kiểm tra" defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* <div>
                <FormInput label="Người nhập" value={user?.full_name || 'Người kiểm tra'} readOnly={true} />
              </div> */}
              
              <div>
                <FormSelect
                  label="Tên sản phẩm"
                  value={formData.product_sku}
                  onChange={(e) => handleFieldChange('product_sku', e.target.value)}
                  options={productOptions}
                />
              </div>

              {/* Chi tiết Table */}
              {detailsList.length > 0 && (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '450px', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '11px' }}>
                        <th style={{ padding: '10px', width: '30px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>STT</th>
                        <th style={{ padding: '10px', width: '80px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>Kết quả</th>
                        <th style={{ padding: '10px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>Chi tiết</th>
                        <th style={{ padding: '10px', textAlign: 'center', width: '50px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>Hình ảnh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsList.map((detail, idx) => (
                        <tr key={detail.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td style={{ padding: '10px' }}>
                            <button
                              onClick={() => {
                                const newConclusion = detail.conclusion === 'pass' ? 'fail' : (detail.conclusion === 'fail' ? 'not_inspected' : 'pass');
                                const newList = [...detailsList];
                                newList[idx].conclusion = newConclusion;
                                setDetailsList(newList);
                              }}
                              style={{ 
                                padding: '4px 6px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%',
                                backgroundColor: detail.conclusion === 'pass' ? '#10b981' : (detail.conclusion === 'fail' ? '#ef4444' : '#94a3b8'),
                                color: '#fff'
                              }}
                            >
                              {detail.conclusion === 'pass' ? 'Đạt' : (detail.conclusion === 'fail' ? 'Không đạt' : 'Chưa KT')}
                            </button>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input
                              type="text"
                              value={detail.name}
                              onChange={(e) => {
                                const newList = [...detailsList];
                                newList[idx].name = e.target.value;
                                setDetailsList(newList);
                              }}
                              style={{ width: '100%', border: 'none', borderBottom: '1px dashed #cbd5e1', fontSize: '12px', outline: 'none', backgroundColor: 'transparent', padding: '4px 0' }}
                            />
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {detail.image ? (
                                <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                                  <img 
                                    src={getImageUrl(detail.image)} 
                                    alt="detail" 
                                    style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => handleTriggerCapture(idx)}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newList = [...detailsList];
                                      newList[idx].image = null;
                                      setDetailsList(newList);
                                    }}
                                    style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerCapture(idx)}
                                  style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                  <Camera size={16} color="#64748b" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#7c6d5e', marginBottom: '4px' }}>Ghi chú</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Nhập ghi chú"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons inside Card */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => {
                    setFormData({ batch_no: '', product_sku: '', notes: '', action: 'luu-kho' });
                    setDetailsList([]);
                  }}
                  style={{ flex: 1, backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          </CollapsibleCard>
        </div>

        {/* 3. History */}
        <div id="history-card">
          <CollapsibleCard title="Lịch sử kiểm tra trong ngày" defaultOpen={false}>
            {isHistoryLoading ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '16px' }}>Đang tải...</div>
            ) : filteredHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedHistoryItem(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{item.batch_no}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>SP: {item.product_sku}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: item.conclusion === 'pass' ? '#10b981' : '#ef4444' }}>
                        {item.conclusion === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTime(item.inspection_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', fontStyle: 'italic', padding: '16px' }}>Không có lịch sử.</div>
            )}
          </CollapsibleCard>
        </div>

        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Xác nhận lưu"
          message="Bạn có chắc chắn muốn lưu phiếu kiểm tra này không?"
          onConfirm={handleSave}
          onCancel={() => setIsConfirmOpen(false)}
        />

        <MessageModal
          isOpen={isMessageOpen}
          type={messageConfig.type}
          title={messageConfig.title}
          message={messageConfig.message}
          onConfirm={() => {
            setIsMessageOpen(false);
            if (messageConfig.type === 'success') {
              setFormData({ batch_no: '', product_sku: '', notes: '', action: 'luu-kho' });
              setDetailsList([]);
            }
          }}
        />

        <InspectionDetailPopup 
          item={selectedHistoryItem} 
          onClose={() => setSelectedHistoryItem(null)} 
        />
      </div>
    </Layout>
  );
};

export default StageAdhesionView;
