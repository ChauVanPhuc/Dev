import React, { useState, useEffect, useMemo } from 'react';
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
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

const StageAdhesionView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logId } = location.state || {};
  const { user } = useAuthStore();
  const inspectionType = 'bam-dinh';

  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    batch_no: '',
    product_sku: '',
    detail_bam_dinh: '',
    results: {
      visual: 'pass',
      size: 'pass',
      function: 'pass',
      conclusion: 'pass'
    },
    notes: '',
    action: 'luu-kho'
  });

  const [currentProducts, setCurrentProducts] = useState([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ type: 'success', title: '', message: '' });
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Fetch PO options
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await apiClient.get('purchase-requisitions/?limit=100');
        if (res.data && Array.isArray(res.data.items)) {
          setOrders(res.data.items);
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
        const res = await apiClient.get(`purchase-order-items/by-po/${formData.batch_no}`);
        if (Array.isArray(res.data)) {
          const uniqueItems = [];
          const seen = new Set();
          res.data.forEach(item => {
            if (!seen.has(item.item_code)) {
              seen.add(item.item_code);
              uniqueItems.push({
                sku: item.item_code,
                name: item.item_name,
                elements: []
              });
            }
          });
          setCurrentProducts(uniqueItems);
        }
      } catch (err) {
        console.error("Lỗi tải sản phẩm của PO:", err);
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
            detail_bam_dinh: extra.detail_bam_dinh || '',
            results: {
              visual: extra.visual || 'pass',
              size: extra.size || 'pass',
              function: extra.function || 'pass',
              conclusion: item.conclusion || 'pass'
            },
            notes: item.notes || '',
            action: extra.action || 'luu-kho'
          });
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

  const detailOptions = useMemo(() => {
    const selectedProd = currentProducts.find(p => p.sku === formData.product_sku);
    if (!formData.product_sku) {
      return [{ label: 'Chọn sản phẩm trước', value: '' }];
    }
    return [{ label: 'Mặt sơn bám dính', value: 'Mặt sơn bám dính' }, { label: 'Góc cạnh liên kết', value: 'Góc cạnh liên kết' }];
  }, [formData.product_sku, currentProducts]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResultChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      results: { ...prev.results, [key]: value }
    }));
  };

  const handleSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      const payload = {
        inspection_type: inspectionType,
        batch_no: formData.batch_no,
        product_sku: formData.product_sku,
        inspector_name: user?.full_name || "Người kiểm tra",
        conclusion: formData.results.conclusion || 'pass',
        notes: formData.notes,
        data_json: JSON.stringify({
          ...formData.results,
          detail_bam_dinh: formData.detail_bam_dinh,
          action: formData.action
        }),
        images_json: JSON.stringify({})
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
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB22 | Kiểm tra bám dính" />

        <div id="stage-form-card">
          <CollapsibleCard title={`Kiểm tra ngày ${new Date().toLocaleDateString('vi-VN')}`} defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <SearchableSelect
                    label="PO"
                    value={formData.batch_no}
                    options={orders.map(o => ({ label: o.po_code, value: o.po_code }))}
                    onChange={(e) => handleFieldChange('batch_no', e.target.value)}
                    placeholder="Tìm mã PO..."
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <FormInput label="Người nhập" value={user?.full_name || 'Người kiểm tra'} readOnly={true} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <FormSelect
                    label="Sản phẩm"
                    value={formData.product_sku}
                    onChange={(e) => handleFieldChange('product_sku', e.target.value)}
                    options={productOptions}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <FormSelect
                    label="Chi tiết"
                    value={formData.detail_bam_dinh}
                    onChange={(e) => handleFieldChange('detail_bam_dinh', e.target.value)}
                    options={detailOptions}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Ghi chú</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="Nhập ghi chú"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'none', outline: 'none' }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Kết quả bám dính:</div>
                <PassFailSelector value={formData.results.conclusion} onChange={(val) => handleResultChange('conclusion', val)} variant="button" />
              </div>
            </div>
          </CollapsibleCard>
        </div>

        {/* History */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '16px', border: '1px solid #e8e1d5' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>Lịch sử gần đây</h3>
          {isHistoryLoading ? (
            <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Đang tải...</div>
          ) : filteredHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedHistoryItem(item)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#fdfbf7', borderRadius: '10px', border: '1px solid #f0ede8', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Kiểm tra bám dính ({item.batch_no})</span>
                    <span style={{ fontSize: '11px', color: '#7c6d5e' }}>SP: {item.product_sku} - Kết quả: <span style={{ fontWeight: '700', color: item.conclusion === 'pass' ? '#10b981' : '#ef4444' }}>{item.conclusion.toUpperCase()}</span></span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#a3978b' }}>{formatDateTime(item.inspection_date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>Không có lịch sử.</div>
          )}
        </div>

        {/* Footer */}
        <div className="responsive-fixed-footer" style={{ backgroundColor: '#FAF6F0', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e8e1d5', zIndex: 100 }}>
          <button
            onClick={() => setIsConfirmOpen(true)}
            style={{ flex: 1, backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Xác nhận
          </button>
          <button
            onClick={() => setFormData({ batch_no: '', product_sku: '', detail_bam_dinh: '', results: { visual: 'pass', size: 'pass', function: 'pass', conclusion: 'pass' }, notes: '', action: 'luu-kho' })}
            style={{ flex: 1, backgroundColor: '#fff', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Hủy
          </button>
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
              setFormData({ batch_no: '', product_sku: '', detail_bam_dinh: '', results: { visual: 'pass', size: 'pass', function: 'pass', conclusion: 'pass' }, notes: '', action: 'luu-kho' });
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
