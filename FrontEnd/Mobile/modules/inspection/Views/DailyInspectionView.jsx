import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import FormInput from '@mobile/Shared/Views/components/form/FormInput';
import FormSelect from '@mobile/Shared/Views/components/form/FormSelect';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import { CheckCircle2, RotateCcw, PlusCircle, Minus, Plus, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '@modules/auth/Models/authModel';
import apiClient from '@shared/services/api';
import { useEffect } from 'react';

/**
 * Stepper Component (Inline style to match image)
 */
const CustomStepper = ({ value, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: '40px', height: '40px', borderRadius: '6px', border: '1px solid #e2e8f0',
          backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Minus size={18} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? 0 : parseInt(val, 10));
        }}
        onFocus={(e) => e.target.select()} // Tự động chọn toàn bộ text khi click vào để dễ sửa
        style={{
          width: '50px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px',
          textAlign: 'center', fontWeight: '700', fontSize: '1rem', color: '#1e293b'
        }}
      />
      <button
        onClick={() => onChange(value + 1)}
        style={{
          width: '40px', height: '40px', borderRadius: '6px', border: '1px solid #e2e8f0',
          backgroundColor: '#4b301e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

const DailyInspection = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('tracking');
  const defaultStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'NM1 - Định hình 1';
  const [department, setDepartment] = useState(defaultStage);
  const [totalProducts, setTotalProducts] = useState(0);
  const [defectTypes, setDefectTypes] = useState([]);
  const [counts, setCounts] = useState({}); // { defect_id: count }
  const [visibleDefectIds, setVisibleDefectIds] = useState([]); // [id1, id2...]
  const [isAddingOther, setIsAddingOther] = useState(false);

  // Đồng bộ công đoạn hoạt động mặc định khi thông tin người dùng được tải
  useEffect(() => {
    const currentDefault = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'NM1 - Định hình 1';
    setDepartment(currentDefault);
  }, [user]);

  // Tạo danh sách tùy chọn các công đoạn cho phép kiểm tra
  const stageOptions = useMemo(() => {
    if (user?.stageDescriptions && user.stageDescriptions.length > 0) {
      return user.stageDescriptions.map(desc => ({
        label: desc,
        value: desc
      }));
    }
    const defaultVal = user?.stage_description || user?.stage_name || 'NM1 - Định hình 1';
    return [{ label: defaultVal, value: defaultVal }];
  }, [user]);

  // 1. Lấy tổng số lượng bàn giao trong ngày
  useEffect(() => {
    const fetchDailyStats = async () => {
      try {
        const stageToFetch = department;
        if (!stageToFetch) return;

        const res = await apiClient.get(`/deliveries/stats/daily?stage=${encodeURIComponent(stageToFetch)}`);
        if (res.data && res.data.total_quantity !== undefined) {
          setTotalProducts(res.data.total_quantity);
        }
      } catch (err) {
        console.error("Lỗi khi tải thống kê sản lượng ngày:", err);
      }
    };
    fetchDailyStats();
  }, [user, department]);

  // 2. Lấy danh mục các loại lỗi từ DB
  useEffect(() => {
    const fetchDefectTypes = async () => {
      try {
        const res = await apiClient.get('/inspections/defect-types');
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else {
          throw new Error("Invalid response format");
        }
        setDefectTypes(data);
        
        // Mặc định: Hiển thị những lỗi quan trọng (needs_tracking = true)
        const importantIds = data.filter(d => d.needs_tracking).map(d => d.id);
        setVisibleDefectIds(importantIds);

        // Khởi tạo count = 0 cho tất cả
        const initialCounts = {};
        data.forEach(d => {
          initialCounts[d.id] = 0;
        });
        setCounts(initialCounts);
      } catch (err) {
        console.error("Lỗi khi tải danh mục lỗi, sử dụng dữ liệu mặc định:", err);
        const fallbackData = [
          { id: 101, name: 'Bề mặt xước', category: 'visual', needs_tracking: true, is_active: true },
          { id: 102, name: 'Lệch màu', category: 'visual', needs_tracking: true, is_active: true },
          { id: 103, name: 'Bọt khí', category: 'visual', needs_tracking: false, is_active: true },
          { id: 104, name: 'Rỗ bề mặt', category: 'visual', needs_tracking: false, is_active: true },
          { id: 201, name: 'Sai kích thước bao', category: 'structure', needs_tracking: true, is_active: true },
          { id: 202, name: 'Móp méo góc', category: 'structure', needs_tracking: false, is_active: true },
          { id: 203, name: 'Độ dày không đều', category: 'structure', needs_tracking: false, is_active: true },
          { id: 301, name: 'Lẫn tạp chất', category: 'material', needs_tracking: true, is_active: true },
          { id: 302, name: 'Ẩm mốc', category: 'material', needs_tracking: false, is_active: true },
          { id: 303, name: 'Nứt vân', category: 'material', needs_tracking: false, is_active: true },
        ];
        setDefectTypes(fallbackData);
        const importantIds = fallbackData.filter(d => d.needs_tracking).map(d => d.id);
        setVisibleDefectIds(importantIds);
        const initialCounts = {};
        fallbackData.forEach(d => {
          initialCounts[d.id] = 0;
        });
        setCounts(initialCounts);
      }
    };
    fetchDefectTypes();
  }, []);

  const handleUpdateCount = (id, val) => {
    setCounts(prev => ({ ...prev, [id]: val }));
  };

  const handleAddVisibleDefect = (defectId) => {
    if (!defectId) return;
    if (!visibleDefectIds.includes(parseInt(defectId))) {
      setVisibleDefectIds(prev => [...prev, parseInt(defectId)]);
    }
    setIsAddingOther(false);
  };

  const handleToggleTracking = async (defectId) => {
    try {
      const res = await apiClient.patch(`/inspections/defect-types/${defectId}/toggle-tracking`);
      if (res.data) {
        // Cập nhật state defectTypes cục bộ
        setDefectTypes(prev => prev.map(d => d.id === defectId ? { ...d, needs_tracking: res.data.needs_tracking } : d));
        
        // Nếu vừa bật tracking, đảm bảo nó có trong danh sách hiển thị
        if (res.data.needs_tracking && !visibleDefectIds.includes(defectId)) {
          setVisibleDefectIds(prev => [...prev, defectId]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái theo dõi:", err);
    }
  };

  const totalDefects = useMemo(() => {
    return Object.values(counts).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  }, [counts]);

  const rate = useMemo(() => {
    const total = parseFloat(totalProducts) || 0;
    const defectsSum = parseFloat(totalDefects) || 0;
    if (total === 0) return 0;
    return ((defectsSum / total) * 100).toFixed(1);
  }, [totalProducts, totalDefects]);

  const availableTabs = useMemo(() => {
    const baseTabs = [
      { id: 'visual', label: 'Ngoại quan' },
      { id: 'structure', label: 'Kết cấu' },
      { id: 'material', label: 'Nguyên liệu' },
    ];
    // Tab "Cần theo dõi" chỉ xuất hiện nếu có dữ liệu needs_tracking
    const hasTracking = defectTypes.some(d => d.needs_tracking);
    if (hasTracking) {
      return [{ id: 'tracking_tab', label: 'Cần theo dõi' }, ...baseTabs];
    }
    return baseTabs;
  }, [defectTypes]);

  // 3. Đảm bảo activeTab luôn hợp lệ khi danh sách tab thay đổi
  useEffect(() => {
    if (availableTabs.length > 0) {
      const isValid = availableTabs.some(t => t.id === activeTab);
      if (!isValid) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [availableTabs, activeTab]);

  // Lọc lỗi hiện tại của tab đang chọn mà CÓ TRONG danh sách hiển thị
  const currentDefects = useMemo(() => {
    if (activeTab === 'tracking_tab') {
      return defectTypes.filter(d => d.needs_tracking && visibleDefectIds.includes(d.id));
    }
    return defectTypes.filter(d => d.category === activeTab && visibleDefectIds.includes(d.id));
  }, [defectTypes, activeTab, visibleDefectIds]);

  // Danh sách lỗi CÙNG TAB nhưng CHƯA hiển thị (để đưa vào combo box)
  const availableDefectsToSelect = useMemo(() => {
    if (activeTab === 'tracking_tab') {
      return defectTypes.filter(d => d.needs_tracking && !visibleDefectIds.includes(d.id));
    }
    return defectTypes.filter(d => d.category === activeTab && !visibleDefectIds.includes(d.id));
  }, [defectTypes, activeTab, visibleDefectIds]);

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    try {
      const defectsPayload = Object.entries(counts)
        .filter(([_, qty]) => parseInt(qty) > 0)
        .map(([id, qty]) => ({
          defect_id: parseInt(id),
          quantity: parseInt(qty)
        }));

      const payload = {
        stage_name: department,
        inspector_id: user?.id || null,
        total_products: parseInt(totalProducts) || 0,
        total_defects: parseInt(totalDefects) || 0,
        defect_rate: parseFloat(rate) || 0,
        defects: defectsPayload
      };

      const res = await apiClient.post('/inspections/daily', payload);
      if (res.data) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigate(-1);
        }, 2000);
      }
    } catch (err) {
      console.error("Lỗi khi lưu dữ liệu:", err);
      alert("Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  return (
    <Layout>
      <div style={{ backgroundColor: '#f8f4f0', minHeight: '100vh', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB5 | Phiếu kiểm tra thường ngày" />

        <div style={{ padding: '12px 16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            
            {/* Header: Date */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                Kiểm tra ngày <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '8px' }}>
                  {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </h2>
            </div>

            {/* Selection Row */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div id="daily-stage-select" style={{ flex: 1 }}>
                <FormSelect
                  label="Chọn công đoạn"
                  value={department}
                  options={stageOptions}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput label="Người nhập" value={user?.full_name || "Hồ Sỹ Khẩn"} readOnly={true} />
              </div>
            </div>

            {/* Summary Row */}
            <div id="daily-stats-summary" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Tổng sản phẩm"
                  type="number"
                  value={totalProducts}
                  onChange={e => setTotalProducts(e.target.value)}
                  inputStyle={{ textAlign: 'center', color: '#94a3b8' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <FormInput
                  label="Tổng lỗi ghi nhận"
                  type="number"
                  value={totalDefects}
                  readOnly={true}
                  inputStyle={{ textAlign: 'center', color: '#4b301e', fontWeight: '800' }}
                />
              </div>
              <div style={{ paddingTop: '20px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                Tỷ lệ: <span style={{ color: '#ef4444' }}>{rate}%</span>
              </div>
            </div>

            {/* Tabs */}
            <div id="daily-defect-tabs" style={{
              display: 'flex',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '20px',
              gap: '5px',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}>
              {availableTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '3px solid #4b301e' : '3px solid transparent',
                    color: activeTab === tab.id ? '#1e293b' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Defects List */}
            <div id="daily-defects-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              {currentDefects.length > 0 ? (
                currentDefects.map(defect => (
                  <div key={defect.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>Tên lỗi</div>
                          {defect.needs_tracking && (
                            <div style={{ 
                              backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800',
                              padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                              border: '1px solid #fecaca'
                            }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                              THEO DÕI
                            </div>
                          )}
                        </div>
                        
                        {/* Toggle Tracking Button */}
                        <button 
                          onClick={() => handleToggleTracking(defect.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                            backgroundColor: defect.needs_tracking ? '#fee2e2' : '#f1f5f9',
                            color: defect.needs_tracking ? '#ef4444' : '#94a3b8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}
                          title={defect.needs_tracking ? 'Bỏ theo dõi' : 'Bật theo dõi'}
                        >
                          {defect.needs_tracking ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div style={{ 
                        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                        fontSize: '0.9rem', color: '#1e293b', backgroundColor: defect.needs_tracking ? '#fff5f5' : '#f8fafc', 
                        fontWeight: '600'
                      }}>
                        {defect.name}
                      </div>
                    </div>
                    <CustomStepper
                      value={counts[defect.id] || 0}
                      onChange={(val) => handleUpdateCount(defect.id, val)}
                    />
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '10px', fontStyle: 'italic' }}>
                   Chưa có lỗi quan trọng cần hiển thị.
                </div>
              )}
            </div>

            {/* Combo Box chọn thêm lỗi - Premium Design */}
            {isAddingOther && (
              <div style={{ 
                marginTop: '15px', 
                padding: '24px', 
                borderRadius: '24px', 
                backgroundColor: '#ffffff', 
                border: '1px solid #f1f5f9',
                boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                position: 'relative',
                marginBottom: '20px',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <button 
                  onClick={() => setIsAddingOther(false)}
                  style={{
                    position: 'absolute', top: '15px', right: '15px', background: '#f8fafc', border: 'none', 
                    borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <RotateCcw size={16} />
                </button>

                <FormSelect 
                  label="Chọn loại lỗi bổ sung"
                  options={[
                    { label: '-- Chọn lỗi từ danh mục --', value: '' },
                    ...availableDefectsToSelect.map(d => ({ label: d.name, value: d.id }))
                  ]}
                  onChange={(e) => handleAddVisibleDefect(e.target.value)}
                  labelStyle={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '800', marginBottom: '10px' }}
                  selectStyle={{ 
                    height: '52px', borderRadius: '16px', fontSize: '1rem', border: '2px solid #f1f5f9',
                    backgroundColor: '#f8fafc', color: '#1e293b', fontWeight: '600'
                  }}
                />
                
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                   Chọn lỗi để bắt đầu ghi nhận số lượng
                </div>
              </div>
            )}

            {/* Add Button */}
            {!isAddingOther && availableDefectsToSelect.length > 0 && (
              <button 
                id="daily-add-defect-btn"
                onClick={() => setIsAddingOther(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
                  color: '#94a3b8', fontWeight: '600', fontSize: '0.9rem', padding: '8px 0', cursor: 'pointer'
                }}
              >
                <PlusCircle size={18} /> <span style={{ fontStyle: 'italic' }}>Thêm Lỗi Khác</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="responsive-fixed-footer" style={{
            padding: '16px',
            backgroundColor: '#f8f4f0', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 100
          }}>
            <button 
              id="daily-submit-btn"
              onClick={() => {
                const hasData = Object.values(counts).some(qty => parseInt(qty) > 0);
                if (!hasData) {
                  alert("Vui lòng nhập ít nhất một lỗi.");
                  return;
                }
                setShowConfirm(true);
              }}
              style={{
                flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '14px', fontSize: '1rem', fontWeight: '800'
              }}
            >
              <CheckCircle2 size={20} /> Xác nhận
            </button>
            <button 
              onClick={() => navigate(-1)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '12px',
                padding: '14px', fontSize: '1rem', fontWeight: '800'
              }}
            >
              <RotateCcw size={20} /> Hủy
            </button>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        {showConfirm && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '24px'
          }}>
            <div style={{
              backgroundColor: '#fff', borderRadius: '32px', padding: '32px', width: '100%', maxWidth: '340px',
              textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
              }}>
                <CheckCircle2 size={32} color="#f97316" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>Xác nhận lưu?</h3>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '32px', lineHeight: '1.6' }}>
                Dữ liệu kiểm tra của bạn sẽ được lưu vào hệ thống vĩnh viễn.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowConfirm(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontWeight: '700', color: '#64748b' }}
                >
                  Đóng
                </button>
                <button 
                  onClick={handleConfirmSave}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', backgroundColor: '#4b301e', fontWeight: '700', color: '#fff' }}
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Success Modal - Simple Version */}
        {showSuccess && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001
          }}>
            <div style={{ 
              backgroundColor: '#fff', padding: '20px 40px', borderRadius: '12px', 
              textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <CheckCircle2 size={24} color="#22c55e" />
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>Lưu kết quả thành công!</span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes modalSlideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes modalScaleIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default DailyInspection;
