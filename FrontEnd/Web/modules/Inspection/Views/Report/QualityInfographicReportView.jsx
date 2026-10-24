import React, { useState, useEffect, useRef } from 'react';
import { 
  FileBarChart2, 
  Calendar, 
  Download, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileText, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * QualityInfographicReportView
 * Báo cáo Điều hành Chất lượng Toàn diện & Poster Infographic (Tuần / Ngày)
 * Tích hợp động cơ phân tích MSSQL, xem trực tiếp và xuất file đa định dạng (PNG, Excel, Word).
 */
export default function QualityInfographicReportView() {
  const { addToast } = useToast?.() || { addToast: (msg, type) => console.log(msg, type) };

  // Chế độ báo cáo: 'weekly' (Tuần) hoặc 'daily' (Ngày)
  const [reportType, setReportType] = useState('weekly');
  const [selectedWeek, setSelectedWeek] = useState('43');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Danh sách các tuần và ngày có dữ liệu từ backend
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  
  // Dữ liệu phân tích JSON cho Quick Stats
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState(null); // 'image' | 'excel' | 'word' | null
  
  // Trạng thái Toàn màn hình
  const [isFullscreen, setIsFullscreen] = useState(false);
  const posterContainerRef = useRef(null);
  const iframeRef = useRef(null);

  // 1. Tải danh sách tùy chọn tuần & ngày
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/quality-reports/options');
        if (res && res.success) {
          setAvailableWeeks(res.available_weeks || []);
          setAvailableDates(res.available_dates || []);
          
          if (res.available_weeks?.length > 0) {
            setSelectedWeek(String(res.available_weeks[0].week));
          }
          if (res.available_dates?.length > 0) {
            setSelectedDate(res.available_dates[0]);
          }
        }
      } catch (err) {
        console.error('Lỗi lấy danh mục tuần/ngày:', err);
      }
    };
    fetchOptions();
  }, []);

  // 2. Tải dữ liệu JSON cho Quick Stats khi thay đổi tuần/ngày
  const currentParam = reportType === 'weekly' ? selectedWeek : selectedDate;

  useEffect(() => {
    if (!currentParam) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/quality-reports/data?type=${reportType}&param=${currentParam}`);
        if (res && res.success) {
          setReportData(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu báo cáo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reportType, currentParam]);

  // 3. Xử lý xuất và tải file
  const handleExport = (type) => {
    setExportingType(type);
    try {
      const downloadUrl = `/api/v1/quality-reports/export/${type}?type=${reportType}&param=${currentParam}`;
      
      // Tạo thẻ a ẩn để kích hoạt tải file trực tiếp từ browser
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      const typeLabel = type === 'image' ? 'Ảnh Poster PNG HD' : (type === 'excel' ? 'Bảng tính Excel (6 Sheets)' : 'Văn bản Word ISO/CAPA');
      if (addToast) {
        addToast(`Đang khởi tạo và tải ${typeLabel}...`, 'success');
      }
    } catch (err) {
      console.error(`Lỗi xuất file ${type}:`, err);
      if (addToast) {
        addToast(`Không thể xuất file: ${err.message || 'Lỗi kết nối'}`, 'error');
      }
    } finally {
      setTimeout(() => setExportingType(null), 1500);
    }
  };

  // 4. Bật/Tắt chế độ Toàn màn hình
  const toggleFullscreen = () => {
    if (!posterContainerRef.current) return;
    if (!document.fullscreenElement) {
      posterContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error('Lỗi toàn màn hình:', err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const kpis = reportData?.kpis;
  const metadata = reportData?.metadata;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#F8FAFC',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      
      {/* HEADER & CONTROLS TOOLBAR */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        
        {/* Left: Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
          }}>
            <FileBarChart2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                Báo cáo Điều hành Chất lượng (Infographic)
              </h1>
              <span style={{
                background: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                A4 Landscape
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Hệ thống giám sát KPI vận hành, phân tích Pareto lỗi và cảnh báo điểm nóng tự động
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher & Time Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Switcher Button Group */}
          <div style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setReportType('weekly')}
              style={{
                border: 'none',
                background: reportType === 'weekly' ? '#FFFFFF' : 'transparent',
                color: reportType === 'weekly' ? '#1E3A8A' : '#64748B',
                fontWeight: reportType === 'weekly' ? 700 : 500,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: reportType === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Theo Tuần
            </button>
            <button
              onClick={() => setReportType('daily')}
              style={{
                border: 'none',
                background: reportType === 'daily' ? '#FFFFFF' : 'transparent',
                color: reportType === 'daily' ? '#1E3A8A' : '#64748B',
                fontWeight: reportType === 'daily' ? 700 : 500,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: reportType === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Theo Ngày
            </button>
          </div>

          {/* Period Dropdown */}
          {reportType === 'weekly' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} color="#64748B" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableWeeks.map((w) => (
                  <option key={`${w.year}-${w.week}`} value={w.week}>
                    Tuần {w.week} (Năm {w.year})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} color="#64748B" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableDates.map((dt) => (
                  <option key={dt} value={dt}>
                    Ngày {dt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Export Actions & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Nút Xuất Ảnh PNG HD */}
          <button
            onClick={() => handleExport('image')}
            disabled={exportingType === 'image'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(2,132,199,0.2)',
              transition: 'background 0.2s'
            }}
            title="Tải Poster Infographic siêu nét chuẩn 2x 4K"
          >
            <ImageIcon size={16} />
            <span>{exportingType === 'image' ? 'Đang xuất...' : 'Xuất PNG HD'}</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={() => handleExport('excel')}
            disabled={exportingType === 'excel'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#15803D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(21,128,61,0.2)',
              transition: 'background 0.2s'
            }}
            title="Tải bảng tính Excel 6 Sheets chi tiết"
          >
            <FileSpreadsheet size={16} />
            <span>{exportingType === 'excel' ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>

          {/* Nút Xuất Word */}
          <button
            onClick={() => handleExport('word')}
            disabled={exportingType === 'word'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1E40AF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 13px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(30,64,175,0.2)',
              transition: 'background 0.2s'
            }}
            title="Tải văn bản báo cáo hành chính ISO/CAPA"
          >
            <FileText size={16} />
            <span>{exportingType === 'word' ? 'Đang xuất...' : 'Xuất Word'}</span>
          </button>

          {/* Nút Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title={isFullscreen ? 'Thu nhỏ' : 'Xem toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* QUICK SUMMARY METRICS BAR */}
      {kpis && (
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '8px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Tỷ lệ đạt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tỷ lệ đạt chất lượng</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803D' }}>
                {kpis.pass_rate?.curr}%
                <span style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '6px', color: kpis.pass_rate?.is_positive ? '#16A34A' : '#DC2626' }}>
                  {kpis.pass_rate?.diff > 0 ? '+' : ''}{kpis.pass_rate?.diff}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tỷ lệ lỗi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Tỷ lệ phế phẩm / lỗi</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#DC2626' }}>
                {kpis.defect_rate?.curr}%
                <span style={{ fontSize: '0.72rem', fontWeight: 600, marginLeft: '6px', color: kpis.defect_rate?.is_positive ? '#16A34A' : '#DC2626' }}>
                  {kpis.defect_rate?.diff > 0 ? '+' : ''}{kpis.defect_rate?.diff}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Phiếu không đạt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Phiếu kiểm không đạt</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {kpis.fail_tickets?.curr} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>/ {kpis.total_tickets?.curr} phiếu</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tổng sản lượng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Sản phẩm kiểm tra</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0284C7' }}>
                {kpis.total_inspected?.curr?.toLocaleString()} sp
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POSTER CANVAS CONTAINER (IFRAME EMBED) */}
      <div 
        ref={posterContainerRef}
        style={{
          flex: 1,
          padding: isFullscreen ? '0' : '16px 24px',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: isFullscreen ? 'stretch' : 'flex-start',
          background: isFullscreen ? '#FFFFFF' : '#F1F5F9'
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: '1440px',
          height: isFullscreen ? '100vh' : 'calc(100vh - 185px)',
          minHeight: '820px',
          backgroundColor: '#FFFFFF',
          borderRadius: isFullscreen ? '0' : '8px',
          boxShadow: isFullscreen ? 'none' : '0 4px 20px rgba(0,0,0,0.08)',
          border: isFullscreen ? 'none' : '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <iframe
            ref={iframeRef}
            src={`/api/v1/quality-reports/preview-html?type=${reportType}&param=${currentParam}`}
            title="Quality Infographic Report"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
        </div>
      </div>

    </div>
  );
}
