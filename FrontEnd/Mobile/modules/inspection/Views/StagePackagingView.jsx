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
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';

const StagePackagingView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logId } = location.state || {};
  const { user } = useAuthStore();
  const inspectionType = 'sau-dong-goi';

  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    batch_no: '',
    product_sku: '',
    results: {
      conclusion: 'pass'
    },
    notes: '',
    inspection_images: {}
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

  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState(null);

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
        console.error("Lỗi tải sản phẩm:", err);
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

          let images = {};
          try {
            images = typeof item.images_json === 'string' ? JSON.parse(item.images_json) : (item.images_json || {});
          } catch (e) {}

          setFormData({
            batch_no: item.batch_no || '',
            product_sku: item.product_sku || '',
            results: {
              conclusion: item.conclusion || 'pass'
            },
            notes: item.notes || '',
            inspection_images: images
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

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResultChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      results: { ...prev.results, [key]: value }
    }));
  };

  const onFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSaving(true);
    try {
      const uploadFormData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadFormData.append('files', files[i]);
      }

      const res = await apiClient.post('inspections/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.paths) {
        const newPaths = res.data.paths;
        setFormData(prev => {
          const currentImages = prev.inspection_images[activeSection] || [];
          return {
            ...prev,
            inspection_images: {
              ...prev.inspection_images,
              [activeSection]: [...currentImages, ...newPaths]
            }
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải ảnh:", err);
      alert("Không thể tải ảnh lên máy chủ.");
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  const removeImage = (sectionTitle, pathToRemove) => {
    setFormData(prev => ({
      ...prev,
      inspection_images: {
        ...prev.inspection_images,
        [sectionTitle]: (prev.inspection_images[sectionTitle] || []).filter(p => p !== pathToRemove)
      }
    }));
  };

  const removeVietnameseTones = (str) => {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.toLowerCase().trim();
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
        data_json: JSON.stringify({}),
        images_json: JSON.stringify(formData.inspection_images)
      };

      if (logId) {
        await apiClient.post(`inspections/stage/${logId}`, payload);
      } else {
        await apiClient.post('inspections/stage', payload);
      }

      setMessageConfig({
        type: 'success',
        title: 'Thành công',
        message: 'Lưu phiếu kiểm tra đóng gói thành công!'
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

  const ImageSection = ({ title }) => {
    const normalizedTitle = title.trim();
    let images = formData.inspection_images[normalizedTitle] || [];

    if (images.length === 0) {
      const searchKey = removeVietnameseTones(normalizedTitle);
      const allKeys = Object.keys(formData.inspection_images);
      const similarKey = allKeys.find(k => removeVietnameseTones(k) === searchKey || removeVietnameseTones(k).includes(searchKey));
      if (similarKey) {
        images = formData.inspection_images[similarKey] || [];
      }
    }

    if (logId && images.length === 0) return null;

    return (
      <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>{title}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {images.map((path, idx) => (
            <div key={idx} style={{ position: 'relative', width: '90px', height: '90px' }}>
              <img
                src={`${apiClient.defaults.baseURL.split('/api/v1')[0]}${path}`}
                alt="Captured"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
              />
              {!logId && (
                <button
                  onClick={() => removeImage(title, path)}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {!logId && (
            <div
              onClick={() => {
                setActiveSection(title);
                fileInputRef.current.click();
              }}
              style={{
                width: '90px',
                height: '90px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Camera size={24} color="#94a3b8" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => item.inspection_type === 'sau-dong-goi').slice(0, 3);
  }, [historyList]);

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB23 | Kiểm tra sau đóng gói" />

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          multiple
        />

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
                <div style={{ flex: 1 }}></div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

              <ImageSection title="Quy trình đóng gói" />
              <ImageSection title="Tem nhãn sau đóng gói" />
              <ImageSection title="Ảnh khác" />

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
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Kết quả đóng gói:</div>
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
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Kiểm tra sau đóng gói ({item.batch_no})</span>
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
            onClick={() => setFormData({ batch_no: '', product_sku: '', results: { conclusion: 'pass' }, notes: '', inspection_images: {} })}
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
              setFormData({ batch_no: '', product_sku: '', results: { conclusion: 'pass' }, notes: '', inspection_images: {} });
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

export default StagePackagingView;
