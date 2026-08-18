import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { user } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('tracking_tab'); // Default tab
  
  const { stage: stateStage } = location.state || {};
  const defaultStage = stateStage || user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'NM1 - Định hình 1';
  const [department, setDepartment] = useState(defaultStage);
  const [totalProducts, setTotalProducts] = useState(0);
  const [defectTypes, setDefectTypes] = useState([]);
  const [counts, setCounts] = useState({}); // { defect_id: count }
  const [visibleDefectIds, setVisibleDefectIds] = useState([]); // [id1, id2...]
  const [isAddingOther, setIsAddingOther] = useState(false);
  const [newCustomDefectName, setNewCustomDefectName] = useState('');
  const [newCustomDefectQty, setNewCustomDefectQty] = useState(0);
  const [isCreatingDefect, setIsCreatingDefect] = useState(false);
  const [todayRecords, setTodayRecords] = useState([]); // Today's inspection records

  // Group categories for rendering
  const CATEGORIES = [
    { id: 'tracking_tab', label: 'Cần theo dõi', isTracking: true },
    { id: 'visual', label: 'Ngoại quan' },
    { id: 'structure', label: 'Kết cấu' },
    { id: 'material', label: 'Nguyên liệu' },
    { id: 'other', label: 'Khác' },
  ];

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

  // Đồng bộ công đoạn hoạt động mặc định khi thông tin người dùng được tải
  useEffect(() => {
    if (!stateStage) {
      const currentDefault = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || 'NM1 - Định hình 1';
      setDepartment(currentDefault);
    }
  }, [user, stateStage]);

  // Đồng bộ công đoạn khi có stateStage truyền từ ngoài vào (như từ Sidebar)
  useEffect(() => {
    if (stateStage && stageOptions && stageOptions.length > 0) {
      const matched = stageOptions.find(opt => 
        opt.value.toLowerCase().includes(stateStage.toLowerCase())
      );
      if (matched) {
        setDepartment(matched.value);
      }
    }
  }, [stateStage, stageOptions]);

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
        const url = user?.id ? `/inspections/defect-types?user_id=${user.id}` : '/inspections/defect-types';
        const res = await apiClient.get(url);
        let data = [];
        if (Array.isArray(res.data)) {
          data = res.data;
        } else {
          throw new Error("Invalid response format");
        }
        setDefectTypes(data);
        
        // Mặc định: Hiển thị TẤT CẢ các lỗi để "sổ hết" theo yêu cầu người dùng
        const allIds = data.map(d => d.id);
        setVisibleDefectIds(allIds);

        // Khởi tạo count = 0 cho tất cả
        const initialCounts = {};
        data.forEach(d => {
          initialCounts[d.id] = 0;
        });
        setCounts(initialCounts);
      } catch (err) {
        console.error("Lỗi khi tải danh mục lỗi từ database:", err);
        setDefectTypes([]);
        setVisibleDefectIds([]);
        setCounts({});
      }
    };
    fetchDefectTypes();
  }, []);

  // 3. Lấy danh sách phiếu kiểm tra trong ngày hôm nay
  useEffect(() => {
    const fetchTodayRecords = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await apiClient.get('/inspections/daily');
        if (Array.isArray(res.data)) {
          // Filter for today's records only and for current department
          const todayData = res.data.filter(record => {
            const recordDate = new Date(record.inspection_date).toISOString().split('T')[0];
            const isToday = recordDate === today;
            const isCurrentStage = record.stage_name === department;
            return isToday && isCurrentStage;
          });
          // Sort by time descending (newest first)
          const sortedData = todayData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setTodayRecords(sortedData);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách phiếu kiểm tra hôm nay:", err);
      }
    };
    fetchTodayRecords();
  }, [department]);

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
      // Find the defect object
      const defect = defectTypes.find(d => d.id === defectId);
      if (!defect) return;

      // Logic: Mobile user usually is QC. They toggle qc_tracking.
      // QA tracking (needs_tracking) cannot be toggled by QC if it's already true.
      
      const url = user?.id 
        ? `/inspections/defect-types/${defectId}/toggle-qc-tracking?user_id=${user.id}` 
        : `/inspections/defect-types/${defectId}/toggle-qc-tracking`;
        
      const res = await apiClient.patch(url);
      if (res.data) {
        // Cập nhật state defectTypes cục bộ
        setDefectTypes(prev => prev.map(d => d.id === defectId ? { 
          ...d, 
          qc_tracking: res.data.qc_tracking,
          is_tracked_by_me: res.data.is_tracked_by_me
        } : d));
        
        // Nếu vừa bật tracking, đảm bảo nó có trong danh sách hiển thị
        if ((res.data.is_tracked_by_me || res.data.qc_tracking) && !visibleDefectIds.includes(defectId)) {
          setVisibleDefectIds(prev => [...prev, defectId]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái theo dõi QC:", err);
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
      { id: 'other', label: 'Khác' },
    ];
    // Tab "Cần theo dõi" xuất hiện nếu có lỗi được QA hoặc QC theo dõi và thuộc công đoạn hiện tại
    const matchesStage = (defect) => {
      if (!department) return true;
      if (!defect.stage) return false;
      try {
        const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
        return Array.isArray(stages) && stages.some(s => s === department);
      } catch (e) {
        return defect.stage === department;
      }
    };

    const hasTracking = defectTypes.some(d => (d.needs_tracking || d.is_tracked_by_me || d.qc_tracking) && matchesStage(d));
    if (hasTracking) {
      return [{ id: 'tracking_tab', label: 'Cần theo dõi' }, ...baseTabs];
    }
    return baseTabs;
  }, [defectTypes, department]);

  // Đảm bảo activeTab luôn hợp lệ khi danh sách tab thay đổi
  useEffect(() => {
    if (availableTabs.length > 0) {
      const isValid = availableTabs.some(t => t.id === activeTab);
      if (!isValid) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [availableTabs, activeTab]);

  // Lọc lỗi hiện tại của tab đang chọn + Lọc theo công đoạn đang chọn
  const currentDefects = useMemo(() => {
    // Helper function to check if defect belongs to current stage
    const matchesStage = (defect) => {
      if (!department) return true;
      if (!defect.stage) return false;
      try {
        const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
        return Array.isArray(stages) && stages.some(s => s === department);
      } catch (e) {
        return defect.stage === department;
      }
    };

    if (activeTab === 'tracking_tab') {
      return defectTypes.filter(d => (d.needs_tracking || d.is_tracked_by_me || d.qc_tracking) && visibleDefectIds.includes(d.id) && matchesStage(d));
    }
    return defectTypes.filter(d => d.category === activeTab && visibleDefectIds.includes(d.id) && matchesStage(d));
  }, [defectTypes, activeTab, visibleDefectIds, department]);

  // Danh sách lỗi chưa hiển thị (để đưa vào combo box)
  const availableDefectsToSelect = useMemo(() => {
    const matchesStage = (defect) => {
      if (!department) return true;
      if (!defect.stage) return false;
      try {
        const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
        return Array.isArray(stages) && stages.some(s => s === department);
      } catch (e) {
        return defect.stage === department;
      }
    };

    if (activeTab === 'tracking_tab') {
      return defectTypes.filter(d => (d.needs_tracking || d.is_tracked_by_me || d.qc_tracking) && !visibleDefectIds.includes(d.id) && matchesStage(d));
    }
    return defectTypes.filter(d => d.category === activeTab && !visibleDefectIds.includes(d.id) && matchesStage(d));
  }, [defectTypes, activeTab, visibleDefectIds, department]);

  const handleAddCustomDefect = async () => {
    if (!newCustomDefectName.trim()) {
      alert("Vui lòng nhập tên lỗi!");
      return;
    }

    setIsCreatingDefect(true);
    try {
      // 1. Tạo loại lỗi mới trong category 'other'
      const payload = {
        name: newCustomDefectName.trim(),
        category: 'other',
        needs_tracking: false,
        is_active: true
      };

      const res = await apiClient.post('/inspections/defect-types', payload);
      
      if (res.data && res.data.id) {
        const newDefect = res.data;
        
        // 2. Cập nhật danh sách defectTypes
        setDefectTypes(prev => [...prev, newDefect]);
        
        // 3. Cho phép hiển thị lỗi này
        setVisibleDefectIds(prev => [...prev, newDefect.id]);
        
        // 4. Cập nhật số lượng
        setCounts(prev => ({ ...prev, [newDefect.id]: newCustomDefectQty }));
        
        // 5. Reset input
        setNewCustomDefectName('');
        setNewCustomDefectQty(0);
        alert("Đã thêm lỗi khác thành công!");
      }
    } catch (err) {
      console.error("Lỗi khi tạo loại lỗi mới:", err);
      alert("Không thể tạo lỗi mới. Vui lòng thử lại!");
    } finally {
      setIsCreatingDefect(false);
    }
  };

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
          navigate('/inspection-daily');
        }, 2000);
      }
    } catch (err) {
      console.error("Lỗi khi lưu dữ liệu:", err);
      alert("Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  return (
    <Layout>
      <div style={{ backgroundColor: '#f8f4f0', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, paddingBottom: '100px' }}>
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
                <FormInput
                  label="Số lượng SX"
                  type="number"
                  value={totalProducts}
                  onChange={e => setTotalProducts(e.target.value)}
                  inputStyle={{ textAlign: 'center', color: '#94a3b8' }}
                />
              </div>
              {/* Hidden: Người nhập field */}
              {/* <div style={{ flex: 1 }}>
                <FormInput label="Người nhập" value={user?.full_name || "Hồ Sỹ Khẩn"} readOnly={true} />
              </div> */}
            </div>

            {/* Summary Row */}
            <div id="daily-stats-summary" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ width: '150px' }}>
                <FormInput
                  label="Tổng lỗi ghi nhận"
                  type="number"
                  value={totalDefects}
                  readOnly={true}
                  inputStyle={{ textAlign: 'center', color: '#4b301e', fontWeight: '800' }}
                />
              </div>
              <div style={{ marginLeft: 'auto', paddingTop: '20px', fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                Tỷ lệ: <span style={{ color: '#ef4444' }}>{rate}%</span>
              </div>
            </div>

            {/* Today's Records Table */}
            {todayRecords.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>
                  Phiếu kiểm tra hôm nay
                </h4>
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '0.8rem' }}>
                          Thời gian
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '0.8rem' }}>
                          Số lượng lỗi
                        </th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '0.8rem' }}>
                          Tỷ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRecords.map((record, index) => {
                        const time = new Date(record.created_at).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                        const calculatedRate = totalProducts > 0 
                          ? ((record.total_defects / totalProducts) * 100).toFixed(1) 
                          : '0.0';
                        return (
                          <tr key={record.id} style={{ 
                            borderBottom: index < todayRecords.length - 1 ? '1px solid #e2e8f0' : 'none',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc'
                          }}>
                            <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: '600' }}>
                              {time}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4b301e', fontWeight: '700' }}>
                              {record.total_defects}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>
                              {calculatedRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
              
              {/* Special Input for "Khác" tab */}
              {activeTab === 'other' && (
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: '1px dashed #cbd5e1',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>Thêm lỗi ngoài danh mục</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <FormInput 
                      label="Tên lỗi mới" 
                      placeholder="VD: Trầy xước nhẹ..." 
                      value={newCustomDefectName}
                      onChange={(e) => setNewCustomDefectName(e.target.value)}
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Số lượng</div>
                        <CustomStepper 
                          value={newCustomDefectQty}
                          onChange={(val) => setNewCustomDefectQty(val)}
                        />
                      </div>
                      <button
                        onClick={handleAddCustomDefect}
                        disabled={isCreatingDefect || !newCustomDefectName.trim()}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: (isCreatingDefect || !newCustomDefectName.trim()) ? '#cbd5e1' : '#4b301e',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isCreatingDefect ? 'Đang thêm...' : <><Plus size={18} /> Thêm</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentDefects.length > 0 ? (
                currentDefects.map(defect => (
                  <div key={defect.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minHeight: '20px' }}>
                        {defect.needs_tracking && (
                          <div style={{ 
                            backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800',
                            padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                            border: '1px solid #fecaca'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            QA TRACK
                          </div>
                        )}
                          {defect.is_tracked_by_me && (
                            <div style={{ 
                              backgroundColor: '#fef3c7', color: '#f59e0b', fontSize: '0.7rem', fontWeight: '800',
                              padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                              border: '1px solid #fde68a'
                            }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                              QC TRACK
                            </div>
                          )}
                        </div>
                        <div 
                          onDoubleClick={() => handleToggleTracking(defect.id)}
                          style={{ 
                            width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            fontSize: '0.9rem', color: '#1e293b', 
                            backgroundColor: defect.needs_tracking ? '#fff5f5' : (defect.is_tracked_by_me ? '#fffbeb' : '#f8fafc'), 
                            fontWeight: '600',
                            userSelect: 'none', // Tránh bôi đen khi click đúp
                            cursor: 'pointer'
                          }}
                        >
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
                   Chưa có lỗi nào được ghi nhận cho danh mục này.
                </div>
              )}

              {defectTypes.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                   Đang tải danh mục lỗi...
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
              onClick={() => navigate('/inspection-daily')}
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
