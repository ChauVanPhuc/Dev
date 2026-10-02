import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import api from '@webShared/Services/api.service';
import '../styles/QualityDashboard.css';
import QualityDashboardToolbar from '../components/QualityDashboardToolbar';
import Section1ProductKpi from '../components/Section1ProductKpi';
import Section2SystemCompliance from '../components/Section2SystemCompliance';
import Section3OperationsHotspots from '../components/Section3OperationsHotspots';
import Section4QualityTrends from '../components/Section4QualityTrends';
import Section5TopDefectsTable from '../components/Section5TopDefectsTable';
import Section6TopLinesTable from '../components/Section6TopLinesTable';
import InspectionHeaderNavCard from '../components/InspectionHeaderNavCard';
import CustomKPIModal from '../components/CustomKPIModal';

/**
 * QualityOverviewDashboard
 * Bảng điều khiển Quản trị chất lượng toàn diện với 6 Sections chuẩn ERP
 * Hỗ trợ Xuất dữ liệu đa định dạng (Ảnh chất lượng cao PNG & Tài liệu PDF Khổ ngang A4)
 */
export const QualityOverviewDashboard = ({ readOnly = false }) => {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('all');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live analytics data from Database
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(false);

  // State cho Modal tùy chỉnh KPI (6 ô Section 1)
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [selectedKpiForEdit, setSelectedKpiForEdit] = useState(null);

  // State xuất dữ liệu
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(''); // 'image' | 'pdf'

  const dashboardRef = useRef(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedFactory && selectedFactory !== 'all') params.append('factory', selectedFactory);
      if (selectedBrand && selectedBrand !== 'all') params.append('brand', selectedBrand);

      const res = await api.get(`/inspections/quality-overview?${params.toString()}`);
      if (res && (res.success || res.section1_kpi)) {
        setOverviewData(res);
      }
    } catch (err) {
      console.error('[QualityOverviewDashboard] Error fetching overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedYear, selectedMonth, startDate, endDate, selectedFactory, selectedBrand]);

  // Tạo chuỗi thời gian cho tên file
  const getFormattedDate = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
  };

  // 1. XUẤT HÌNH ẢNH DASHBOARD (PNG CHẤT LƯỢNG CAO)
  const handleExportImage = async () => {
    if (!dashboardRef.current || isExporting) return;
    setIsExporting(true);
    setExportType('image');

    try {
      // Chờ đóng menu dropdown để không dính vào ảnh
      await new Promise((resolve) => setTimeout(resolve, 160));

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // 2x DPI cho độ nét cao
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#F7F4F0',
        logging: false
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Bao_Cao_Tong_Quan_Chat_Luong_${getFormattedDate()}.png`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error('Lỗi khi xuất ảnh Dashboard:', error);
      alert('Có lỗi xảy ra khi xuất ảnh: ' + (error.message || error));
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  // 2. XUẤT TÀI LIỆU PDF DASHBOARD (A4 LANDSCAPE)
  const handleExportPDF = async () => {
    if (!dashboardRef.current || isExporting) return;
    setIsExporting(true);
    setExportType('pdf');

    try {
      await new Promise((resolve) => setTimeout(resolve, 160));

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#F7F4F0',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Khổ giấy A4 Landscape (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Căn lề 6mm mỗi bên
      const margin = 6;
      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      let renderWidth = availableWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      let posX = margin;
      let posY = margin;

      if (renderHeight > availableHeight) {
        renderHeight = availableHeight;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
        posX = (pdfWidth - renderWidth) / 2;
        posY = margin;
      } else {
        posY = (pdfHeight - renderHeight) / 2;
      }

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      pdf.save(`Bao_Cao_Tong_Quan_Chat_Luong_${getFormattedDate()}.pdf`);
    } catch (error) {
      console.error('Lỗi khi xuất PDF Dashboard:', error);
      alert('Có lỗi xảy ra khi xuất PDF: ' + (error.message || error));
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  return (
    <div 
      ref={dashboardRef} 
      className="quality-dashboard-root" 
      style={{ padding: '4px 0', background: '#F7F4F0' }}
    >
      {/* 1. Toolbar lọc chuẩn phong cách ERP G7 */}
      <QualityDashboardToolbar
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedFactory={selectedFactory}
        setSelectedFactory={setSelectedFactory}
        selectedLine={selectedLine}
        setSelectedLine={setSelectedLine}
        selectedDept={selectedDept}
        setSelectedDept={setSelectedDept}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        availableFilters={overviewData?.available_filters}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onExportImage={handleExportImage}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
        exportType={exportType}
      />

      {/* 2. Main Content Grid với 6 Sections chuẩn kết nối trực tiếp CSDL */}
      <div className="qd-main-grid">
        {/* Hàng 1 (Top Row): Section 1 (trái) + Section 2 & 3 (phải) */}
        <div className="qd-row-top">
          {/* Section 1: Chỉ số chất lượng sản phẩm (KPI) */}
          <Section1ProductKpi 
            kpiData={overviewData?.section1_kpi}
            onEditKpi={readOnly ? null : (kpi) => {
              setSelectedKpiForEdit(kpi);
              setIsKpiModalOpen(true);
            }}
          />

          {/* Cột phải: Section 2 (Hiệu suất & Tuân thủ) + Section 3 (Giám sát & Hiện trường - Pareto Lỗi Trọng Yếu) */}
          <div className="qd-col-right">
            <Section2SystemCompliance complianceData={overviewData?.section2_compliance} />
            <Section3OperationsHotspots data={overviewData?.section3_pareto} />
          </div>
        </div>

        {/* Hàng 2 (Bottom Row): Section 4, 5, 6 */}
        <div className="qd-row-bottom">
          {/* Section 4: Cơ cấu lỗi theo nhóm & Kênh phát hiện */}
          <Section4QualityTrends groupsData={overviewData?.section4_categories} />

          {/* Section 5: Top lỗi thường gặp */}
          <Section5TopDefectsTable
            defectsData={overviewData?.section5_top_defects}
            linesData={overviewData?.section5_top_lines}
          />

          {/* Section 6: Top line/bộ phận có tỷ lệ lỗi cao */}
          <Section6TopLinesTable />
        </div>
      </div>

      {/* 3. Popup Modal Tùy chỉnh Dữ liệu 6 Thẻ KPI */}
      <CustomKPIModal
        isOpen={isKpiModalOpen}
        onClose={() => {
          setIsKpiModalOpen(false);
          setSelectedKpiForEdit(null);
        }}
        kpiItem={selectedKpiForEdit}
        onSaveSuccess={() => {
          fetchOverview();
        }}
      />
    </div>
  );
};

export default QualityOverviewDashboard;
