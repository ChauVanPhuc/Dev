import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { handleExportExcel as exportExcel, handleExportDetailExcel as exportDetailExcel } from '../utils/deliveryExcelExporter';
import { 
    Search, Filter, Download, MoreHorizontal, 
    FileText, CheckCircle, Clock, AlertTriangle,
    ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    ChevronDown, X, User, Calendar, 
    MapPin, Activity, CheckCircle2, AlertCircle, 
    Undo2, Droplet, Maximize2, FileSpreadsheet, Layers, Info
} from 'lucide-react';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';


export const useDeliveryTracking = () => {
    const [deliveries, setDeliveries] = useState([]);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        error: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

    // Year and Month selection states (default to current year and month)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [availableDates, setAvailableDates] = useState({
        [currentYear]: [currentMonth]
    });

    const years = React.useMemo(() => {
        return Object.keys(availableDates).map(Number).sort((a, b) => b - a);
    }, [availableDates]);

    const months = React.useMemo(() => {
        return availableDates[selectedYear] || [];
    }, [availableDates, selectedYear]);

    useEffect(() => {
        const loadAvailableDates = async () => {
            try {
                const datesMapping = await deliveryService.getAvailableDates();
                if (datesMapping && Object.keys(datesMapping).length > 0) {
                    setAvailableDates(datesMapping);
                    
                    const yearsList = Object.keys(datesMapping).map(Number).sort((a, b) => b - a);
                    const latestYear = yearsList[0];
                    setSelectedYear(latestYear);
                    
                    const monthsList = datesMapping[latestYear] || [];
                    if (monthsList.length > 0) {
                        const currentM = new Date().getMonth() + 1;
                        if (monthsList.includes(currentM) && latestYear === new Date().getFullYear()) {
                            setSelectedMonth(currentM);
                        } else {
                            setSelectedMonth(monthsList[monthsList.length - 1]);
                        }
                    }
                }
            } catch (error) {
                // Thầm lặng bỏ qua lỗi tải danh sách thời gian có sẵn
            }
        };
        loadAvailableDates();
    }, []);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedDeliveryStage, setSelectedDeliveryStage] = useState('all');
    const [selectedReceivingStage, setSelectedReceivingStage] = useState('all');

    // State for Details Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [deliveryDetail, setDeliveryDetail] = useState(null);
    const [qcDetail, setQcDetail] = useState(null);
    const [inputQcDetail, setInputQcDetail] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalTab, setModalTab] = useState('handover'); // 'handover', 'qc_end', 'qc_start'
    const [activeImage, setActiveImage] = useState(null); // Lightbox popup image
    const [pdfLoading, setPdfLoading] = useState(false); // PDF loading state
    const [actionMenuId, setActionMenuId] = useState(null);

    useEffect(() => {
        const handleOutsideClick = () => {
            setActionMenuId(null);
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const handleOpenDetailModal = async (delivery) => {
        setSelectedDelivery(delivery);
        setIsDetailModalOpen(true);
        setModalLoading(true);
        setModalTab('handover');
        try {
            const detailData = await deliveryService.getDeliveryDetail(delivery.id);
            setDeliveryDetail(detailData);
            
            try {
                const qcData = await deliveryService.getQCDetailedResult(delivery.id);
                setQcDetail(qcData);
            } catch (qcErr) {
                setQcDetail(null);
            }

            try {
                const targetPlanId = detailData?.plan_id || delivery.plan_id;
                const targetPartName = detailData?.part_name || delivery.part_name;
                if (targetPlanId && targetPartName) {
                    const inputQcData = await deliveryService.getInputInspectionResult(targetPlanId, targetPartName);
                    setInputQcDetail(inputQcData);
                } else {
                    setInputQcDetail(null);
                }
            } catch (inputQcErr) {
                setInputQcDetail(null);
            }
        } catch (err) {
            setDeliveryDetail(null);
        } finally {
            setModalLoading(false);
        }
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedDelivery(null);
        setDeliveryDetail(null);
        setQcDetail(null);
        setInputQcDetail(null);
        setActiveImage(null);
    };
    const handleExportExcel = async () => {
        await exportExcel(filteredDeliveries);
    };

    const handleExportDetailExcel = async () => {
        await exportDetailExcel(selectedDelivery, deliveryDetail, inputQcDetail, qcDetail);
    };

    const handlePrintPDF = async () => {
        if (!selectedDelivery || !deliveryDetail) return;

        const loadHtml2Pdf = () => {
            return new Promise((resolve, reject) => {
                if (window.html2pdf) {
                    resolve(window.html2pdf);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = () => resolve(window.html2pdf);
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const fetchImageAsBase64 = async (imagePath) => {
            try {
                const cleanPath = imagePath.replace(/^\//, '');
                const response = await fetch(`${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(cleanPath)}&as_base64=true`);
                if (!response.ok) return null;
                try {
                    const data = await response.json();
                    if (data && data.base64) {
                        const ext = data.extension || 'png';
                        return `data:image/${ext};base64,${data.base64}`;
                    }
                } catch (e) {
                    // Fallback if not JSON
                }
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result || null);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error("Lỗi khi tải ảnh dạng base64:", error);
            }
            return null;
        };

        const getB64OrUrl = async (imagePath) => {
            if (!imagePath) return '';
            const b64 = await fetchImageAsBase64(imagePath);
            if (b64) return b64;
            return `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(imagePath.replace(/^\//, ''))}`;
        };

        let length = inputQcDetail?.measured_length;
        let width = inputQcDetail?.measured_width;
        let height = inputQcDetail?.measured_height;
        if ((!length && !width && !height) && inputQcDetail?.specification) {
            const parts = inputQcDetail.specification.split(/[*x]/).map(p => p.trim());
            if (parts.length === 3) {
                height = parts[0];
                width = parts[1];
                length = parts[2];
            }
        }

        const handoverDateStr = deliveryDetail.created_at 
            ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') 
            : '---';

        let qcResults = {};
        try {
            qcResults = typeof qcDetail?.qc_info?.results_json === 'string'
                ? JSON.parse(qcDetail.qc_info.results_json)
                : (qcDetail?.qc_info?.results_json || {});
        } catch (e) {
            // Thầm lặng bỏ qua lỗi parse kết quả kiểm định
        }

        const isFailed = deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối';
        const conclusionText = isFailed ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG';

        const qcEndInspectedDateStr = qcDetail?.qc_info?.created_at 
            ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') 
            : '---';

        const qcEndMoistureMax = qcResults.moisture?.max !== undefined && qcResults.moisture?.max !== null 
            ? `${qcResults.moisture.max}%` 
            : '---';
        const qcEndMoistureMin = qcResults.moisture?.min !== undefined && qcResults.moisture?.min !== null 
            ? `${qcResults.moisture.min}%` 
            : '---';
        const qcEndNote = qcDetail?.qc_info?.note || 'Không có ghi chú kiểm định chất lượng.';

        const qcInboundInspectedDateStr = inputQcDetail?.inspected_at 
            ? new Date(inputQcDetail.inspected_at).toLocaleString('vi-VN') 
            : '---';

        // Load handover images
        const handoverImages = [];
        if (deliveryDetail.images) {
            const list = deliveryDetail.images.filter(img => !img.description?.startsWith('qc_'));
            for (let i = 0; i < list.length; i++) {
                const img = list[i];
                const url = await getB64OrUrl(img.image_path);
                handoverImages.push({
                    url,
                    description: img.description || 'Ảnh bàn giao'
                });
            }
        }

        // Load qc images
        const qcImages = [];
        if (qcDetail?.images) {
            for (let i = 0; i < qcDetail.images.length; i++) {
                const img = qcDetail.images[i];
                const url = await getB64OrUrl(img.image_path);
                qcImages.push({
                    url,
                    description: getCategoryLabel(img.description)
                });
            }
        }

        // Load input qc images
        const inputQcImages = [];
        if (inputQcDetail) {
            const rawPaths = [inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3].filter(Boolean);
            for (let i = 0; i < rawPaths.length; i++) {
                const path = rawPaths[i];
                const url = await getB64OrUrl(path);
                inputQcImages.push({
                    url,
                    description: `Ảnh kiểm định ${i + 1}`
                });
            }
        }

        const generateImageGridHtml = (images, title) => {
            if (!images || images.length === 0) return '';
            return `
                <div class="image-section-title">${title}</div>
                <div class="image-grid">
                    ${images.map((img, idx) => `
                        <div class="image-card">
                            <img src="${img.url}" alt="${img.description}" />
                            <div class="image-caption">Ảnh ${idx + 1}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        const generateGroupedImageGridHtml = (images, title) => {
            if (!images || images.length === 0) return '';
            
            // Group by description
            const groups = {};
            images.forEach(img => {
                const desc = img.description || 'Ảnh minh chứng';
                if (!groups[desc]) groups[desc] = [];
                groups[desc].push(img);
            });
            
            const groupKeys = Object.keys(groups);
            
            let html = `<div class="image-section-title">${title}</div>`;
            
            groupKeys.forEach(groupName => {
                const groupImages = groups[groupName];
                html += `
                    <div class="group-header">
                        ▶ Hạng mục kiểm tra: ${groupName}
                    </div>
                    <div class="image-grid">
                        ${groupImages.map((img, idx) => `
                            <div class="image-card">
                                <img src="${img.url}" alt="${img.description}" />
                                <div class="image-caption">Ảnh ${idx + 1}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            });
            
            return html;
        };

        let ordersHtml = '';
        if (deliveryDetail.details && deliveryDetail.details.length > 0) {
            ordersHtml = deliveryDetail.details.map((detail, idx) => `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td style="font-weight: bold; color: #7B5233;">${detail.partner_po || '---'}</td>
                    <td>${detail.order_code || '---'}</td>
                    <td>${detail.customer || '---'}</td>
                    <td>${detail.product_names || '---'}</td>
                    <td style="text-align: right; font-weight: bold;">${detail.quantity}</td>
                </tr>
            `).join('');
        } else {
            ordersHtml = `
                <tr>
                    <td colspan="6" style="text-align: center; font-style: italic; color: #8D6E63; padding: 20px;">
                        Không có thông tin phân bổ PO cụ thể (Hàng dư thừa ngoài kế hoạch hoặc không liên kết đơn hàng).
                    </td>
                </tr>
            `;
        }

        let qcEndDefectsHtml = '';
        if (qcDetail?.defect_logs && qcDetail.defect_logs.length > 0) {
            qcEndDefectsHtml = `
                <table class="pdf-data-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">STT</th>
                            <th style="width: 32%;">Hạng mục lỗi</th>
                            <th style="width: 15%;">Mức độ</th>
                            <th style="width: 18%; text-align: right;">Số lượng lỗi</th>
                            <th style="width: 27%;">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${qcDetail.defect_logs.map((log, idx) => {
                            const isCritical = String(log.severity).toLowerCase().includes('nặng');
                            const sevBg = isCritical ? '#F8D7DA' : '#FFFFF2';
                            const sevColor = isCritical ? '#C62828' : '#7F6000';
                            return `
                                <tr>
                                    <td style="text-align: center;">${idx + 1}</td>
                                    <td style="font-weight: bold;">${log.defect_name || 'Lỗi không xác định'}</td>
                                    <td style="text-align: center; background-color: ${sevBg}; color: ${sevColor}; font-weight: bold;">${log.severity || 'Nhẹ'}</td>
                                    <td style="text-align: right; font-weight: bold; color: #C62828;">${log.quantity || 0}</td>
                                    <td>${log.note || '---'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else if (qcDetail) {
            qcEndDefectsHtml = `
                <div style="padding: 12px; background-color: #E8F5E9; color: #2E7D32; border-radius: 8px; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #C8E6C9;">
                    ✓ Không phát hiện lỗi chất lượng nào trong quá trình kiểm tra đầu cuối.
                </div>
            `;
        }

        const planText = deliveryDetail.plan_name || (deliveryDetail.plan_id ? `KH-${deliveryDetail.plan_id}` : '---');
        const deliveryStageText = `${deliveryDetail.delivery_stage || '---'} ➔ ${deliveryDetail.receiving_stage || '---'}`;

        let qcEndHtml = '';
        if (!qcDetail) {
            qcEndHtml = `
                <div style="padding: 12px; background-color: #FFF3E0; color: #E65100; border-radius: 8px; font-size: 13px; font-weight: bold; page-break-inside: avoid; break-inside: avoid; margin-top: 10px; border: 1px solid #FFE0B2;">
                    ⚠ Chưa có kết quả kiểm tra QC đầu cuối cho phiếu này.
                </div>
            `;
        } else {
            const conclusionBg = !isFailed ? '#E2F0D9' : '#F8D7DA';
            const conclusionColor = !isFailed ? '#385723' : '#C62828';

            qcEndHtml = `
                <table class="pdf-details-table" style="margin-top: 10px;">
                    <tr>
                        <td class="pdf-details-label" style="width: 250px;">Kết luận</td>
                        <td class="pdf-details-value pdf-status-val" style="background-color: ${conclusionBg}; color: ${conclusionColor}; font-weight: bold;">${conclusionText}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Người kiểm định</td>
                        <td class="pdf-details-value">${deliveryDetail.qc_receipt_name || '---'}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Thời gian kiểm định</td>
                        <td class="pdf-details-value">${qcEndInspectedDateStr}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Độ ẩm lớn nhất</td>
                        <td class="pdf-details-value">${qcEndMoistureMax}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Độ ẩm nhỏ nhất</td>
                        <td class="pdf-details-value">${qcEndMoistureMin}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Ghi chú QC đầu cuối</td>
                        <td class="pdf-details-value" style="font-style: italic;">${qcEndNote}</td>
                    </tr>
                </table>

                <div style="margin: 15px 0 8px 0; font-size: 13px; font-weight: bold; color: #8D6E63;">
                    Danh sách lỗi phát hiện:
                </div>
                ${qcEndDefectsHtml}
                ${generateGroupedImageGridHtml(qcImages, 'Ảnh kiểm tra QC')}
            `;
        }

        let qcInboundHtml = '';
        if (!inputQcDetail) {
            qcInboundHtml = `
                <div style="padding: 12px; background-color: #FAF6F0; border: 1px dashed #EADCC9; color: #8D6E63; border-radius: 8px; font-size: 13px; page-break-inside: avoid; break-inside: avoid; margin-top: 10px;">
                    Không có thông tin kiểm định chất lượng đầu vào của công đoạn tiếp theo.
                </div>
            `;
        } else {
            const resultText = inputQcDetail.result || 'CHƯA RÕ';
            const isInputPassed = resultText === 'Đạt';
            const conclusionBg = isInputPassed ? '#E2F0D9' : '#F8D7DA';
            const conclusionColor = isInputPassed ? '#385723' : '#C62828';

            qcInboundHtml = `
                <table class="pdf-details-table" style="margin-top: 10px;">
                    <tr>
                        <td class="pdf-details-label" style="width: 250px;">Kết luận</td>
                        <td class="pdf-details-value pdf-status-val" style="background-color: ${conclusionBg}; color: ${conclusionColor}; font-weight: bold;">${resultText}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Người kiểm định</td>
                        <td class="pdf-details-value">${inputQcDetail.inspector_name || '---'}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Thời gian kiểm định</td>
                        <td class="pdf-details-value">${qcInboundInspectedDateStr}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Mã Container</td>
                        <td class="pdf-details-value">${inputQcDetail.cont_name || '---'}</td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Kích thước (Dày x Rộng x Dài)</td>
                        <td class="pdf-details-value" style="color: #7B5233; font-weight: bold;">
                             ${height ? height + ' mm' : '---'} x ${width ? width + ' mm' : '---'} x ${length ? length + ' mm' : '---'}
                        </td>
                    </tr>
                    <tr>
                        <td class="pdf-details-label">Ghi chú QC đầu vào</td>
                        <td class="pdf-details-value" style="font-style: italic;">${inputQcDetail.note || 'Không có ghi chú.'}</td>
                    </tr>
                </table>
                ${generateImageGridHtml(inputQcImages, 'Ảnh kiểm định đầu vào')}
            `;
        }

        const pdfStyles = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
            .pdf-container {
                font-family: 'Outfit', 'Segoe UI', Roboto, sans-serif;
                color: #2D1A12;
                line-height: 1.4;
                padding: 0;
                background: #fff;
            }
            .pdf-container .main-title-banner {
                background-color: #8D6E63;
                color: #ffffff;
                text-align: center;
                padding: 15px 10px;
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .pdf-container .main-title-banner h2 {
                margin: 0;
                font-size: 18px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .pdf-container .main-title-banner p {
                margin: 5px 0 0 0;
                font-size: 11px;
                font-weight: 600;
                color: #FAF6F0;
                letter-spacing: 0.5px;
            }
            .pdf-container .section-title {
                margin: 25px 0 10px 0;
                font-size: 13px;
                font-weight: 800;
                color: #ffffff;
                background-color: #8D6E63;
                padding: 8px 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .pdf-container .image-section-title {
                margin: 15px 0 10px 0;
                font-size: 12px;
                font-weight: 800;
                color: #ffffff;
                background-color: #A1887F;
                padding: 6px 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .pdf-container .group-header {
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 12px;
                font-weight: bold;
                color: #5D4037;
                background: #FAF6F0;
                padding: 6px 12px;
                border-left: 3px solid #7B5233;
                border-radius: 4px;
            }
            .pdf-container .pdf-details-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 13px;
            }
            .pdf-container .pdf-details-table td {
                border: 1px solid #D9D9D9;
                padding: 8px 12px;
                vertical-align: middle;
            }
            .pdf-container .pdf-details-label {
                background: #F2F4F7;
                color: #2C3E50;
                font-weight: bold;
                width: 250px;
            }
            .pdf-container .pdf-details-value {
                background: #ffffff;
                color: #2D1A12;
            }
            .pdf-container .pdf-number-val {
                text-align: right;
                font-weight: bold;
            }
            .pdf-container .pdf-status-val {
                text-align: left;
            }
            .pdf-container .pdf-data-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 13px;
                table-layout: fixed;
            }
            .pdf-container .pdf-data-table th {
                background: #A1887F;
                border: 1px solid #D9D9D9;
                padding: 8px 10px;
                font-weight: 800;
                color: #ffffff;
                text-align: left;
                word-wrap: break-word;
                word-break: break-word;
                white-space: normal;
                overflow: hidden;
            }
            .pdf-container .pdf-data-table td {
                border: 1px solid #D9D9D9;
                padding: 8px 10px;
                word-wrap: break-word;
                word-break: break-word;
                white-space: normal;
                overflow: hidden;
            }
            .pdf-container .image-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin: 10px 0 20px 0;
            }
            .pdf-container .image-card {
                background: #ffffff;
                border: 1px solid #D7CCC8;
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
            }
            .pdf-container .image-card img {
                max-width: 100%;
                max-height: 140px;
                border-radius: 4px;
                object-fit: contain;
            }
            .pdf-container .image-caption {
                margin-top: 8px;
                font-size: 11px;
                font-style: italic;
                font-weight: bold;
                color: #5D4037;
                text-align: center;
            }
        `;

        const pdfBodyContent = `
            <!-- Header Banner -->
            <div class="main-title-banner">
                <h2>THÔNG TIN CHI TIẾT PHIẾU BÀN GIAO BG-${deliveryDetail.id}</h2>
                <p>BÁO CÁO XUẤT NGÀY: ${handoverDateStr.toUpperCase()} | HỆ THỐNG SMARTFLOW</p>
            </div>

            <!-- SECTION 1 -->
            <div class="section-title">1. THÔNG TIN CHUNG</div>
            <table class="pdf-details-table">
                <tr>
                    <td class="pdf-details-label" style="width: 250px;">Mã phiếu</td>
                    <td class="pdf-details-value">BG-${deliveryDetail.id}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Linh kiện / Tên chi tiết</td>
                    <td class="pdf-details-value">${deliveryDetail.part_name || "---"}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Quy cách kỹ thuật</td>
                    <td class="pdf-details-value">${deliveryDetail.specification || "---"}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Kế hoạch sản xuất</td>
                    <td class="pdf-details-value">${planText}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Công đoạn vận chuyển</td>
                    <td class="pdf-details-value">${deliveryStageText}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Thời gian lập</td>
                    <td class="pdf-details-value">${handoverDateStr}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Người thực hiện giao</td>
                    <td class="pdf-details-value">${deliveryDetail.sx_delivery_name || "---"}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Người tiếp nhận</td>
                    <td class="pdf-details-value">${deliveryDetail.sx_receipt_name || "---"}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Ghi chú bàn giao</td>
                    <td class="pdf-details-value" style="font-style: italic;">${deliveryDetail.note || "Không có"}</td>
                </tr>
            </table>
            ${generateImageGridHtml(handoverImages, 'Ảnh minh chứng giao')}

            <!-- SECTION 2 -->
            <div class="section-title">2. SỐ LƯỢNG THỰC TẾ</div>
            <table class="pdf-details-table">
                <tr>
                    <td class="pdf-details-label" style="width: 250px;">SL Giao Tổng</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.quantity_total || 0}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">SL Thực Nhận</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.quantity_received || 0}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">SL Trả Lại (QC)</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.quantity_returned || 0}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">SL Lỗi (QC)</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.quantity_error || 0}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">SL Thực Kiểm (QC)</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.quantity_inspection || 0}</td>
                </tr>
                <tr>
                    <td class="pdf-details-label">Phế Phẩm / Dư</td>
                    <td class="pdf-details-value pdf-number-val">${deliveryDetail.residual || 0}</td>
                </tr>
            </table>

            <!-- SECTION 3 -->
            <div class="section-title">3. PHÂN BỐ ĐƠN HÀNG (PO CHI TIẾT)</div>
            <table class="pdf-data-table">
                <thead>
                    <tr>
                        <th style="width: 6%; text-align: center;">STT</th>
                        <th style="width: 16%;">Số PO đối tác</th>
                        <th style="width: 16%;">Mã đơn hàng</th>
                        <th style="width: 20%;">Khách hàng</th>
                        <th style="width: 30%;">Sản phẩm đơn hàng</th>
                        <th style="width: 12%; text-align: right;">Số lượng</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersHtml}
                </tbody>
            </table>

            <!-- SECTION 4 -->
            <div class="section-title">4. KẾT QUẢ KIỂM TRA QC (ĐẦU CUỐI)</div>
            ${qcEndHtml}

            <!-- SECTION 5 -->
            <div class="section-title">5. KẾT QUẢ KIỂM TRA QC (ĐẦU VÀO)</div>
            ${qcInboundHtml}
        `;

        const fullHtmlContent = `
            <div>
                <style>${pdfStyles}</style>
                <div class="pdf-container">
                    ${pdfBodyContent}
                </div>
            </div>
        `;

        loadHtml2Pdf().then((html2pdf) => {
            const opt = {
                margin: 10,
                filename: `Phieu_ban_giao_BG_${deliveryDetail.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(fullHtmlContent).save().catch(err => {
                console.error('PDF generation error:', err);
                toast('error', 'Có lỗi xảy ra khi tạo tệp PDF!');
            });
        }).catch(err => {
            console.error('Failed to load html2pdf:', err);
            toast('error', 'Không thể tải thư viện xuất PDF. Vui lòng kiểm tra kết nối mạng!');
        });
    };

    const getCategoryLabel = (tag) => {
        switch (tag) {
            case 'qc_moisture': return 'Độ ẩm';
            case 'qc_bend': return 'Độ cong';
            case 'qc_size': return 'Kích thước';
            case 'qc_structure': return 'Kết cấu';
            case 'qc_visual': return 'Bám dính sơn';
            case 'qc_accessories': return 'Phụ kiện';
            case 'qc_visual_ext': return 'Ngoại quan';
            case 'qc_functional': return 'Tính năng';
            case 'qc_general': return 'QC Chung';
            default: return tag ? tag.replace('qc_', '').toUpperCase() : 'Ảnh minh chứng';
        }
    };

    useEffect(() => {
        fetchData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const fetchData = async (year = selectedYear, month = selectedMonth) => {
        try {
            setLoading(true);
            const data = await deliveryService.getAllDeliveries(0, 0, year, month);
            setDeliveries(data);

            // Tính toán thống kê từ dữ liệu thực
            const total = data.length;
            const completed = data.filter(d => d.status === 'Hoàn thành' || d.status === 'Đã Nhận Hàng').length;
            const pending = data.filter(d => d.status === 'Chờ Nhận Hàng' || d.status === 'Chờ Xác Nhận').length;
            const error = data.filter(d => d.quantity_returned > 0 || d.status === 'Lỗi').length;

            setStats({ total, completed, pending, error });
        } catch (error) {
            // Thầm lặng bỏ qua lỗi lấy dữ liệu bàn giao
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
                return { bg: '#E8F5E9', color: '#2E7D32', label: 'HOÀN THÀNH' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
                return { bg: '#FFF3E0', color: '#E65100', label: 'CHỜ NHẬN' };
            case 'Lỗi':
            case 'Từ chối':
                return { bg: '#FFEBEE', color: '#C62828', label: 'LỖI/TRẢ' };
            default:
                return { bg: '#F5F5F5', color: '#757575', label: (status || 'KHÔNG RÕ').toUpperCase() };
        }
    };

    const getRowBgColor = (row) => {
        if (row.quantity_returned > 0 || row.status === 'Lỗi') return '#FFEBEE';
        if (row.status === 'Hoàn thành' || row.status === 'Đã Nhận Hàng') return '#E8F5E9';
        return '#FFFFFF';
    };

    const deliveryStages = React.useMemo(() => {
        return ['all', ...new Set(deliveries.map(d => d.delivery_stage).filter(Boolean))];
    }, [deliveries]);

    const receivingStages = React.useMemo(() => {
        return ['all', ...new Set(deliveries.map(d => d.receiving_stage).filter(Boolean))];
    }, [deliveries]);

    const filteredDeliveries = React.useMemo(() => {
        return deliveries.filter(row => {
            // 1. Status Filter
            if (filterStatus !== 'all') {
                const statusInfo = getStatusStyle(row.status);
                if (filterStatus === 'completed' && statusInfo.label !== 'HOÀN THÀNH') return false;
                if (filterStatus === 'pending' && statusInfo.label !== 'CHỜ NHẬN') return false;
                if (filterStatus === 'error' && statusInfo.label !== 'LỖI/TRẢ') return false;
            }

            // 2. Delivery Stage Filter
            if (selectedDeliveryStage !== 'all' && row.delivery_stage !== selectedDeliveryStage) return false;

            // 3. Receiving Stage Filter
            if (selectedReceivingStage !== 'all' && row.receiving_stage !== selectedReceivingStage) return false;

            // 4. Search Term Filter
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const matchId = `bg-${row.id}`.toLowerCase().includes(term);
                const matchPartName = (row.part_name || '').toLowerCase().includes(term);
                const matchStageIn = (row.delivery_stage || '').toLowerCase().includes(term);
                const matchStageOut = (row.receiving_stage || '').toLowerCase().includes(term);
                const matchSender = (row.sx_delivery_name || '').toLowerCase().includes(term);
                const matchReceiver = (row.sx_receipt_name || '').toLowerCase().includes(term);
                
                return matchId || matchPartName || matchStageIn || matchStageOut || matchSender || matchReceiver;
            }

            return true;
        });
    }, [deliveries, filterStatus, selectedDeliveryStage, selectedReceivingStage, searchTerm]);




  return {
    accumulatedWidth,
    actionMenuId,
    activeImage,
    addDefectDataRow,
    addDefectsHeader,
    addEmptyTablePlaceholder,
    addImageSection,
    addKeyValueRow,
    addPODatRow,
    addPOHeader,
    addSectionHeader,
    api,
    availableDates,
    b64,
    bg,
    borderStyle,
    c,
    captionCell,
    captionR,
    cleanPath,
    colRange,
    completed,
    conclusionBg,
    conclusionColor,
    conclusionText,
    createdDate,
    data,
    dataCells,
    deliveries,
    deliveryDetail,
    deliveryStageText,
    deliveryStages,
    desc,
    dims,
    error,
    ext,
    fetchData,
    fetchImageAsBase64,
    fetchPromises,
    fetchUrl,
    fg,
    filterStatus,
    filteredDeliveries,
    firstCell,
    fitImage,
    fullHtmlContent,
    gIdx,
    generateGroupedImageGridHtml,
    generateImageGridHtml,
    getB64OrUrl,
    getCategoryLabel,
    getCellAndOffset,
    getColumnRanges,
    getImageDimensions,
    getRowBgColor,
    getStatusStyle,
    groupImages,
    groupKeys,
    groupName,
    groups,
    handleCloseDetailModal,
    handleExportDetailExcel,
    handleExportExcel,
    handleOpenDetailModal,
    handleOutsideClick,
    handlePrintPDF,
    handoverDateStr,
    handoverImages,
    headerCells,
    html,
    i,
    idx,
    imageId,
    img,
    imgR,
    imgToBase64,
    inputQcDetail,
    inputQcImages,
    inspectedAt,
    isCritical,
    isDetailModalOpen,
    isFailed,
    isFilterBarOpen,
    isInputPassed,
    isQC,
    itemsPerPage,
    j,
    labelText,
    lastDataRowNum,
    latestYear,
    leftOffsetPx,
    lines,
    list,
    loadAvailableDates,
    loadHtml2Pdf,
    loading,
    matchId,
    matchPartName,
    matchReceiver,
    matchSender,
    matchStageIn,
    matchStageOut,
    maxLen,
    modalLoading,
    modalTab,
    moistureMax,
    moistureMin,
    months,
    offPx,
    opt,
    ordersHtml,
    paginatedDeliveries,
    path,
    pdfBodyContent,
    pdfLoading,
    pdfStyles,
    pending,
    planText,
    productNames,
    qcDetail,
    qcEndDefectsHtml,
    qcEndHtml,
    qcEndInspectedDateStr,
    qcEndMoistureMax,
    qcEndMoistureMin,
    qcEndNote,
    qcImages,
    qcInboundHtml,
    qcInboundInspectedDateStr,
    qcNote,
    qcResults,
    r,
    rGiao,
    rLoi,
    rNhan,
    rTra,
    range,
    rangeWidth,
    ratio,
    rawPaths,
    reader,
    receivingStages,
    res,
    response,
    script,
    searchTerm,
    selectedDelivery,
    selectedDeliveryStage,
    selectedMonth,
    selectedReceivingStage,
    selectedYear,
    setActionMenuId,
    setActiveImage,
    setAvailableDates,
    setCurrentPage,
    setDeliveries,
    setDeliveryDetail,
    setFilterStatus,
    setInputQcDetail,
    setIsDetailModalOpen,
    setIsFilterBarOpen,
    setItemsPerPage,
    setLoading,
    setModalLoading,
    setModalTab,
    setPdfLoading,
    setQcDetail,
    setSearchTerm,
    setSelectedDelivery,
    setSelectedDeliveryStage,
    setSelectedMonth,
    setSelectedReceivingStage,
    setSelectedYear,
    setStats,
    sevBg,
    sevColor,
    sevText,
    shr,
    size,
    spacerR,
    sr,
    stats,
    statusInfo,
    statusText,
    subHeaderCell,
    subTitleCell,
    subTitleRow,
    subtitleCell,
    targetPartName,
    targetPlanId,
    text,
    tlAnchor,
    toast,
    topOffsetPx,
    useDeliveryTracking,
    valueCells,
    w,
    years
  };
};
