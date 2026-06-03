import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  UserRoundCheck, 
  ChevronDown, 
  Pencil,
  CheckCircle2,
  Circle,
  Timer
} from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

/**
 * CircularProgress Component
 * Vẽ biểu đồ vòng tròn bằng SVG
 */
const CircularProgress = ({ percentage, size = 60, strokeWidth = 6, color = '#4b301e' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#eeece8"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const KPITracking = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'details'
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [evalFilter, setEvalFilter] = useState('Theo tháng');
  const [periodFilter, setPeriodFilter] = useState('Tháng 3');
  const [kpiDetails, setKpiDetails] = useState([]);
  const [loadingKpi, setLoadingKpi] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState('Tháng 3');
  const [selectedWeek, setSelectedWeek] = useState('Tuần 16');
  const [monthScore, setMonthScore] = useState(72);
  const [weekScore, setWeekScore] = useState(12);

  // Mock data cho Checklist CV ngày
  const checklistData = [
    { id: 1, content: 'Kiểm tra thiết bị', status: 'Hoàn thành', route: '/equipment-list' },
    { id: 2, content: 'Nhập lỗi công đoạn', status: 'Chưa làm', route: '/inspection-daily' },
    { id: 3, content: 'Phiếu kiểm tra', status: 'Chưa làm', route: '/inspection-stage' },
    { id: 4, content: 'Kiểm tra bàn giao', status: 'Đang tiến hành', route: '/delivery-info' },
    { id: 5, content: 'Kiểm tra quy trình A', status: 'Chưa làm', route: '/plan' }
  ];

  // Offline Mock data fallback cho Chi tiết KPI
  const kpiDetailsDataFallback = {
    'Theo tháng': {
      'Tháng 1': [
        { content: 'Tỷ lệ hàng đạt lần đầu', target: '95%', actual: '86%', type: 'danger' },
        { content: 'Tỷ lệ lỗi phát hiện', target: '95%', actual: '98%', type: 'success' },
        { content: 'Điểm kỷ luật', target: '100%', actual: '100%', type: 'neutral' },
        { content: 'Tỷ lệ hàng đạt chất lượng', target: '99,5%', actual: '99,5%', type: 'neutral' },
        { content: 'Năng suất công việc', target: '100%', actual: '100%', type: 'neutral' }
      ],
      'Tháng 2': [
        { content: 'Tỷ lệ hàng đạt lần đầu', target: '95%', actual: '91%', type: 'danger' },
        { content: 'Tỷ lệ lỗi phát hiện', target: '95%', actual: '96%', type: 'success' },
        { content: 'Điểm kỷ luật', target: '100%', actual: '98%', type: 'danger' },
        { content: 'Tỷ lệ hàng đạt chất lượng', target: '99,5%', actual: '99,0%', type: 'danger' },
        { content: 'Năng suất công việc', target: '100%', actual: '102%', type: 'success' }
      ],
      'Tháng 3': [
        { content: 'Tỷ lệ hàng đạt lần đầu', target: '95%', actual: '95%', type: 'success' },
        { content: 'Tỷ lệ lỗi phát hiện', target: '95%', actual: '95%', type: 'success' },
        { content: 'Điểm kỷ luật', target: '100%', actual: '100%', type: 'neutral' },
        { content: 'Tỷ lệ hàng đạt chất lượng', target: '99,5%', actual: '99,7%', type: 'success' },
        { content: 'Năng suất công việc', target: '100%', actual: '100%', type: 'neutral' }
      ]
    },
    'Theo tuần': {
      'Tuần 15': [
        { content: 'Tỷ lệ hàng đạt lần đầu', target: '95%', actual: '80%', type: 'danger' },
        { content: 'Tỷ lệ lỗi phát hiện', target: '95%', actual: '99%', type: 'success' },
        { content: 'Điểm kỷ luật', target: '100%', actual: '100%', type: 'neutral' },
        { content: 'Tỷ lệ hàng đạt chất lượng', target: '99,5%', actual: '99,5%', type: 'neutral' },
        { content: 'Năng suất công việc', target: '100%', actual: '90%', type: 'danger' }
      ],
      'Tuần 16': [
        { content: 'Tỷ lệ hàng đạt lần đầu', target: '95%', actual: '86%', type: 'danger' },
        { content: 'Tỷ lệ lỗi phát hiện', target: '95%', actual: '98%', type: 'success' },
        { content: 'Điểm kỷ luật', target: '100%', actual: '100%', type: 'neutral' },
        { content: 'Tỷ lệ hàng đạt chất lượng', target: '99,5%', actual: '99,5%', type: 'neutral' },
        { content: 'Năng suất công việc', target: '100%', actual: '100%', type: 'neutral' }
      ]
    }
  };

  // Hàm tính tổng điểm trung bình các chỉ tiêu KPI (Tỷ lệ phần trăm chỉ tiêu đạt mục tiêu: status !== 'danger')
  const calculateScore = (items) => {
    if (!items || items.length === 0) return 0;
    
    let metCount = 0;
    items.forEach(item => {
      const itemStatus = item.status || item.type;
      if (itemStatus !== 'danger') {
        metCount++;
      }
    });
    
    return Math.round((metCount / items.length) * 100);
  };

  // Tạo dữ liệu thống kê cho Dashboard
  const kpiStats = useMemo(() => {
    return [
      { label: `KPI ${selectedMonth}`, value: monthScore, color: '#4b301e' },
      { label: `KPI ${selectedWeek}`, value: weekScore, color: '#4b301e' }
    ];
  }, [selectedMonth, monthScore, selectedWeek, weekScore]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Hoàn thành': return '#2d231a';
      case 'Chưa làm': return '#ef4444';
      case 'Đang tiến hành': return '#22c55e';
      default: return '#7c6d5e';
    }
  };

  // Lọc checklist theo trạng thái
  const filteredChecklist = checklistData.filter(item => {
    if (statusFilter === 'Tất cả') return true;
    return item.status === statusFilter;
  });

  // Đồng bộ hóa kỳ đã chọn dựa trên bộ lọc của người dùng
  useEffect(() => {
    if (evalFilter === 'Theo tháng') {
      setSelectedMonth(periodFilter);
    } else {
      setSelectedWeek(periodFilter);
    }
  }, [evalFilter, periodFilter]);

  // Gọi API tải dữ liệu KPI cho cả Tháng và Tuần được chọn
  useEffect(() => {
    let active = true;
    const fetchKPIsAndScores = async () => {
      setLoadingKpi(true);
      try {
        // 1. Tải KPI cho tháng đang chọn
        const monthResp = await apiClient.get('/kpis/', {
          params: { period_type: 'Theo tháng', period_name: selectedMonth }
        });
        
        // 2. Tải KPI cho tuần đang chọn
        const weekResp = await apiClient.get('/kpis/', {
          params: { period_type: 'Theo tuần', period_name: selectedWeek }
        });

        if (active) {
          const mScore = calculateScore(monthResp.data);
          const wScore = calculateScore(weekResp.data);
          
          setMonthScore(mScore);
          setWeekScore(wScore);

          // Cập nhật bảng chi tiết tương ứng với chế độ hiển thị hiện tại
          if (evalFilter === 'Theo tháng') {
            setKpiDetails(monthResp.data);
          } else {
            setKpiDetails(weekResp.data);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu KPI từ API, sử dụng mock fallback:', err);
        if (active) {
          const listMonth = kpiDetailsDataFallback['Theo tháng'][selectedMonth] || kpiDetailsDataFallback['Theo tháng']['Tháng 3'];
          const listWeek = kpiDetailsDataFallback['Theo tuần'][selectedWeek] || kpiDetailsDataFallback['Theo tuần']['Tuần 16'];
          
          setMonthScore(calculateScore(listMonth));
          setWeekScore(calculateScore(listWeek));

          if (evalFilter === 'Theo tháng') {
            setKpiDetails(listMonth);
          } else {
            setKpiDetails(listWeek);
          }
        }
      } finally {
        if (active) setLoadingKpi(false);
      }
    };

    fetchKPIsAndScores();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedWeek, evalFilter]);

  // Danh sách các period tùy thuộc vào hiển thị đánh giá
  const periodOptions = useMemo(() => {
    if (evalFilter === 'Theo tháng') {
      return ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    } else {
      return Array.from({ length: 20 }, (_, i) => `Tuần ${i + 1}`);
    }
  }, [evalFilter]);

  // Tự động reset period khi đổi chế độ lọc
  useEffect(() => {
    if (evalFilter === 'Theo tháng') {
      setPeriodFilter('Tháng 3');
    } else {
      setPeriodFilter('Tuần 16');
    }
  }, [evalFilter]);

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="Theo dõi KPI" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
        
        {/* KPI Dashboard Cards */}
        <div id="kpi-stats-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {kpiStats.map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{
                backgroundColor: '#fff',
                borderRadius: '24px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#7c6d5e', fontWeight: '500' }}>{stat.label}</span>
                <span style={{ fontSize: '28px', fontWeight: '800', color: '#4b301e' }}>{stat.value}%</span>
              </div>
              <CircularProgress percentage={stat.value} size={54} color={stat.color} />
            </motion.div>
          ))}
        </div>

        {/* Tab Switcher - Underline Style (Khớp ảnh 2) */}
        <div id="kpi-tab-switcher" style={{ 
          display: 'flex', 
          borderBottom: '2px solid #e5e0d8', 
          position: 'relative',
          backgroundColor: 'transparent',
          margin: '0 -16px', // Kéo dài ra sát mép
          padding: '0 16px'
        }}>
          <button 
            onClick={() => setActiveTab('checklist')}
            style={{ 
              flex: 1, 
              padding: '16px 8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              color: activeTab === 'checklist' ? '#4b301e' : '#8b8b8b',
              fontWeight: activeTab === 'checklist' ? '700' : '600',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              transition: 'backgroundColor 0.3s ease, color 0.3s ease'
            }}
          >
            <ClipboardCheck size={20} color={activeTab === 'checklist' ? '#4b301e' : '#8b8b8b'} />
            <span style={{ fontSize: '15px' }}>Checklist CV ngày</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('details')}
            style={{ 
              flex: 1, 
              padding: '16px 8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              color: activeTab === 'details' ? '#4b301e' : '#8b8b8b',
              fontWeight: activeTab === 'details' ? '700' : '600',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              transition: 'backgroundColor 0.3s ease, color 0.3s ease'
            }}
          >
            <UserRoundCheck size={20} color={activeTab === 'details' ? '#4b301e' : '#8b8b8b'} />
            <span style={{ fontSize: '15px' }}>Chi tiết KPI</span>
          </button>
          
          {/* Animated Underline Indicator */}
          <motion.div 
            style={{ 
              position: 'absolute', 
              bottom: '-2px', 
              height: '4px', 
              backgroundColor: '#4b301e', 
              width: 'calc(50% - 16px)', // Trừ bớt padding
              left: '16px',
              borderRadius: '2px 2px 0 0'
            }}
            animate={{ x: activeTab === 'checklist' ? 0 : '100%' }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        </div>

        {/* Filters and Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'checklist' ? (
            <motion.div 
              key="checklist"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {/* Checklist Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Hiển thị theo trạng thái</span>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #e8e1d5',
                      backgroundColor: '#fff',
                      appearance: 'none',
                      fontSize: '14px',
                      color: '#4b301e',
                      fontWeight: '500'
                    }}
                  >
                    <option>Tất cả</option>
                    <option>Hoàn thành</option>
                    <option>Chưa làm</option>
                    <option>Đang tiến hành</option>
                  </select>
                  <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6d5e', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Checklist Table */}
              <div id="kpi-checklist-table" style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e8e1d5' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#724e34', color: '#fff' }}>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'left', fontWeight: '600' }}>Nội dung</th>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'left', fontWeight: '600' }}>Trạng thái</th>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>Thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChecklist.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: idx === filteredChecklist.length - 1 ? 'none' : '1px solid #f0ede8' }}>
                        <td style={{ padding: '14px 12px', fontSize: '13px', color: '#2d231a', fontWeight: '500' }}>{item.content}</td>
                        <td style={{ padding: '14px 12px', fontSize: '13px', color: getStatusColor(item.status), fontWeight: '600' }}>{item.status}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => {
                              if (item.route) {
                                navigate(item.route);
                              }
                            }}
                            style={{ color: '#7c6d5e', border: 'none', background: 'none', cursor: 'pointer' }}
                          >
                            <Pencil size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* KPI Details Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Hiển thị đánh giá</span>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={evalFilter}
                      onChange={(e) => setEvalFilter(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e8e1d5', backgroundColor: '#fff', appearance: 'none', fontSize: '14px', color: '#4b301e' }}
                    >
                      <option>Theo tháng</option>
                      <option>Theo tuần</option>
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6d5e', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b301e' }}>Chọn tháng</span>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e8e1d5', backgroundColor: '#fff', appearance: 'none', fontSize: '14px', color: '#4b301e' }}
                    >
                      {periodOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7c6d5e', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* KPI Details Table */}
              <div id="kpi-details-table" style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e8e1d5' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#724e34', color: '#fff' }}>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'left', fontWeight: '600' }}>Nội dung</th>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>Mục tiêu</th>
                      <th style={{ padding: '12px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>Thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingKpi ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '24px 12px', fontSize: '14px', color: '#7c6d5e', textAlign: 'center', fontWeight: '500' }}>
                          Đang tải dữ liệu KPI...
                        </td>
                      </tr>
                    ) : kpiDetails.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '24px 12px', fontSize: '14px', color: '#7c6d5e', textAlign: 'center', fontWeight: '500' }}>
                          Không tìm thấy dữ liệu KPI nào cho khoảng thời gian này.
                        </td>
                      </tr>
                    ) : (
                      kpiDetails.map((item, idx) => {
                        const targetText = typeof item.target === 'number' ? `${item.target}%`.replace('.', ',') : item.target;
                        const actualText = typeof item.actual === 'number' ? `${item.actual}%`.replace('.', ',') : item.actual;
                        const itemType = item.status || item.type;
                        
                        return (
                          <tr key={idx} style={{ borderBottom: idx === kpiDetails.length - 1 ? 'none' : '1px solid #f0ede8' }}>
                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#2d231a', fontWeight: '500' }}>{item.content}</td>
                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#2d231a', textAlign: 'center' }}>{targetText}</td>
                            <td style={{ 
                              padding: '14px 12px', 
                              fontSize: '13px', 
                              textAlign: 'center',
                              color: itemType === 'danger' ? '#ef4444' : itemType === 'success' ? '#22c55e' : '#2d231a',
                              fontWeight: '700'
                            }}>
                              {actualText}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  );
};

export default KPITracking;
