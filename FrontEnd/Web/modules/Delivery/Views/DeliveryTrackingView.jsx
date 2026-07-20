import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import deliveryService from '@modules/Delivery/Models/delivery.service';
import { API_ROOT } from '@webShared/Services/api.service';
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

const DeliveryTracking = () => {
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
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Danh sách bàn giao");

        // Force gridlines to be visible
        ws.views = [{ showGridLines: true }];

        // 1. Add Title Row
        ws.mergeCells('A1:N1');
        const titleCell = ws.getCell('A1');
        titleCell.value = "DANH SÁCH PHIẾU BÀN GIAO";
        titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 40;

        // 2. Add headers
        const headers = [
            "STT", "Mã Phiếu", "Tên Chi Tiết", "Công Đoạn Vào", "Công Đoạn Ra",
            "Số Lượng Giao", "Số Lượng Nhận", "Số Lượng Trả", "Số Lượng Lỗi",
            "Trạng Thái", "Thời Gian Lập", "Người Giao", "Người Nhận", "Ghi Chú"
        ];
        
        ws.addRow([]); // Blank spacer (Row 2)
        ws.getRow(2).height = 12;

        const headerRow = ws.addRow(headers); // Row 3
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                bottom: { style: 'medium', color: { argb: 'FF8D6E63' } },
                right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
            };
        });

        // 3. Add data rows
        let totalGiao = 0;
        let totalNhan = 0;
        let totalTra = 0;
        let totalLoi = 0;

        filteredDeliveries.forEach((row, idx) => {
            const isEven = idx % 2 === 1;
            const createdDate = row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : "";
            
            const rGiao = row.quantity_total || 0;
            const rNhan = row.quantity_received || 0;
            const rTra = row.quantity_returned || 0;
            const rLoi = row.quantity_error || 0;

            totalGiao += rGiao;
            totalNhan += rNhan;
            totalTra += rTra;
            totalLoi += rLoi;

            const rowData = [
                idx + 1,
                `BG-${row.id}`,
                row.part_name || "",
                row.delivery_stage || "",
                row.receiving_stage || "",
                rGiao,
                rNhan,
                rTra,
                rLoi,
                row.status || "",
                createdDate,
                row.sx_delivery_name || "",
                row.sx_receipt_name || "",
                row.note || ""
            ];

            const addedRow = ws.addRow(rowData);
            addedRow.height = 24;

            addedRow.eachCell((cell, colNum) => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };

                // Alternating zebra backgrounds
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }

                // Alignment
                if (colNum === 1 || colNum === 2 || colNum === 11) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (colNum >= 6 && colNum <= 9) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    cell.numFmt = '#,##0';
                } else if (colNum === 10) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.font = { name: 'Segoe UI', size: 10, bold: true };
                    const statusText = (row.status || "").toLowerCase();
                    if (statusText.includes("hoàn thành") || statusText.includes("đạt")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } };
                        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF385723' } };
                    } else if (statusText.includes("chờ") || statusText.includes("đang")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
                        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF7F6000' } };
                    } else if (statusText.includes("lỗi") || statusText.includes("trả") || statusText.includes("từ chối")) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
                        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC00000' } };
                    }
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                }
            });
        });

        // 4. Totals Row
        const totalRowData = [
            "Tổng cộng", "", "", "", "",
            totalGiao, totalNhan, totalTra, totalLoi,
            "", "", "", "", ""
        ];
        
        const lastDataRowNum = ws.lastRow.number;
        ws.mergeCells(`A${lastDataRowNum + 1}:E${lastDataRowNum + 1}`);
        const totalRow = ws.addRow(totalRowData);
        totalRow.height = 26;
        totalRow.eachCell((cell, colNum) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9EDF4' } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                bottom: { style: 'double', color: { argb: 'FF5D4037' } },
                right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
            };

            if (colNum === 1) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNum >= 6 && colNum <= 9) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
            }
        });

        // Set column widths
        ws.columns = [
            { width: 8 },   // STT
            { width: 15 },  // Mã Phiếu
            { width: 25 },  // Tên Chi Tiết
            { width: 20 },  // Công Đoạn Vào
            { width: 20 },  // Công Đoạn Ra
            { width: 16 },  // Số Lượng Giao
            { width: 16 },  // Số Lượng Nhận
            { width: 16 },  // Số Lượng Trả
            { width: 16 },  // Số Lượng Lỗi
            { width: 18 },  // Trạng Thái
            { width: 22 },  // Thời Gian Lập
            { width: 22 },  // Người Giao
            { width: 22 },  // Người Nhận
            { width: 30 }   // Ghi Chú
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Danh_sach_ban_giao_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    const handleExportDetailExcel = async () => {
        if (!selectedDelivery || !deliveryDetail) return;

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

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Chi tiết bàn giao");

        // Force gridlines to be visible
        ws.views = [{ showGridLines: true }];

        // Layout Columns: 6 columns (A to F)
        ws.columns = [
            { width: 10 },  // Col A: STT / Label Left
            { width: 34 },  // Col B: Label Right / PO Partner
            { width: 22 },  // Col C: Order Code / Value 1
            { width: 22 },  // Col D: Customer / Value 2
            { width: 28 },  // Col E: Product Names / Value 3
            { width: 15 }   // Col F: Quantity / Value 4
        ];

        // --- STYLING HELPERS ---
        
        // Helper function to fetch image as base64
        const fetchImageAsBase64 = async (imageUrl) => {
            try {
                // If it's the image-proxy endpoint, append as_base64=true
                const fetchUrl = imageUrl.includes('image-proxy') 
                    ? `${imageUrl}&as_base64=true` 
                    : imageUrl;
                
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    return null;
                }

                if (fetchUrl.includes('as_base64=true')) {
                    const data = await response.json();
                    return data.base64;
                }
                
                const blob = await response.blob();
                
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < uint8Array.length; i++) {
                        binary += String.fromCharCode(uint8Array[i]);
                    }
                    const base64 = btoa(binary);
                    return base64;
                } catch (error) {
                    return null;
                }
            } catch (error) {
                return null;
            }
        };

        // Helper function to get original image dimensions from base64
        const getImageDimensions = (base64Str) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.onerror = () => {
                    resolve({ width: 150, height: 100 }); // fallback
                };
                img.src = `data:image/png;base64,${base64Str}`;
            });
        };

        // Helper function to fit image inside maximum dimensions while maintaining aspect ratio
        const fitImage = (naturalWidth, naturalHeight, maxWidth = 150, maxHeight = 100) => {
            const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
            return {
                width: Math.round(naturalWidth * ratio),
                height: Math.round(naturalHeight * ratio)
            };
        };

        // Helper function to add image section with embedded images
        const addImageSection = async (wsSheet, images, title, imagesPerRow = 3, isGrouped = false) => {
            if (!images || images.length === 0) {
                addSectionHeader(wsSheet, title);
                addEmptyTablePlaceholder(wsSheet, "Không có ảnh minh chứng nào");
                wsSheet.addRow([]); // spacer
                wsSheet.lastRow.height = 15;
                return;
            }

            addSectionHeader(wsSheet, title);
            
            // Add a clean vertical spacer row right after header
            const initSpacer = wsSheet.addRow([]);
            initSpacer.height = 12;
            wsSheet.mergeCells(`A${initSpacer.number}:F${initSpacer.number}`);
            for (let c = 1; c <= 6; c++) {
                const cell = wsSheet.getCell(initSpacer.number, c);
                cell.border = {};
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFFFF' }
                };
            }

            // Fetch all images first
            let imageBase64s;
            try {
                const fetchPromises = images.map((img, idx) => {
                    return fetchImageAsBase64(img.url).catch(error => {
                        return null;
                    });
                });
                imageBase64s = await Promise.all(fetchPromises);
            } catch (error) {
                imageBase64s = images.map(() => null);
            }

            // Width mapping in pixels: A=80, B=260, C=170, D=170, E=220, F=120
            const colWidths = [80, 260, 170, 170, 220, 120];
            const rowHeightPx = 100 * 1.33; // ~133px

            // Column ranges for different layouts
            const getColumnRanges = (index, totalPerRow) => {
                let range = { start: 'A', end: 'F', startNum: 0, endNum: 6 };
                if (totalPerRow === 3) {
                    if (index === 0) range = { start: 'A', end: 'B', startNum: 0, endNum: 2 };
                    else if (index === 1) range = { start: 'C', end: 'D', startNum: 2, endNum: 4 };
                    else if (index === 2) range = { start: 'E', end: 'F', startNum: 4, endNum: 6 };
                } else if (totalPerRow === 2) {
                    if (index === 0) range = { start: 'A', end: 'C', startNum: 0, endNum: 3 };
                    else if (index === 1) range = { start: 'D', end: 'F', startNum: 3, endNum: 6 };
                }
                return range;
            };

            // Helper to find cell index and offset in EMUs for a given absolute pixel position from the start column
            const getCellAndOffset = (startCol, absolutePx) => {
                let accumulatedWidth = 0;
                let c = startCol;
                let offPx = absolutePx;
                while (c < colWidths.length) {
                    const w = colWidths[c];
                    if (offPx < w) {
                        break;
                    }
                    offPx -= w;
                    c++;
                }
                return { col: c, colOff: Math.round(offPx * 9525) };
            };

            if (isGrouped) {
                // Group images by description
                const groups = {};
                images.forEach(img => {
                    const desc = img.description || 'Ảnh minh chứng';
                    if (!groups[desc]) groups[desc] = [];
                    groups[desc].push(img);
                });

                // Create a Map of img object to its base64 string
                const imgToBase64 = new Map();
                for (let idx = 0; idx < images.length; idx++) {
                    imgToBase64.set(images[idx], imageBase64s[idx]);
                }

                const groupKeys = Object.keys(groups);

                for (let gIdx = 0; gIdx < groupKeys.length; gIdx++) {
                    const groupName = groupKeys[gIdx];
                    const groupImages = groups[groupName];

                    // Add a clean sub-header row for this category group
                    const subHeaderRow = wsSheet.addRow([]);
                    const shr = subHeaderRow.number;
                    wsSheet.mergeCells(`A${shr}:F${shr}`);
                    
                    for (let c = 1; c <= 6; c++) {
                        const cell = wsSheet.getCell(shr, c);
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF5F0EB' } // Coffee-cream color for sub-header background
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFD7CCC8' } },
                            bottom: { style: 'thin', color: { argb: 'FFD7CCC8' } },
                            left: { style: 'thin', color: { argb: 'FFD7CCC8' } },
                            right: { style: 'thin', color: { argb: 'FFD7CCC8' } }
                        };
                    }
                    const subHeaderCell = wsSheet.getCell(`A${shr}`);
                    subHeaderCell.value = `▶ Hạng mục kiểm tra: ${groupName}`;
                    subHeaderCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF5D4037' } };
                    subHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    subHeaderRow.height = 24;

                    // Tiny spacer right after sub-header
                    const groupSpacer = wsSheet.addRow([]);
                    groupSpacer.height = 8;
                    wsSheet.mergeCells(`A${groupSpacer.number}:F${groupSpacer.number}`);
                    for (let c = 1; c <= 6; c++) {
                        const cell = wsSheet.getCell(groupSpacer.number, c);
                        cell.border = {};
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                    }

                    // Render grid for this group
                    for (let i = 0; i < groupImages.length; i += imagesPerRow) {
                        const rowImages = groupImages.slice(i, i + imagesPerRow);
                        
                        // Fit dimensions
                        const fittedSizes = [];
                        for (let j = 0; j < rowImages.length; j++) {
                            const img = rowImages[j];
                            const base64 = imgToBase64.get(img);
                            if (base64) {
                                const dims = await getImageDimensions(base64);
                                fittedSizes.push(fitImage(dims.width, dims.height, 150, 100));
                            } else {
                                fittedSizes.push({ width: 150, height: 100 });
                            }
                        }

                        // Add image row
                        const imgRow = wsSheet.addRow([]);
                        const imgR = imgRow.number;
                        imgRow.height = 100;

                        // Fill white background
                        for (let c = 1; c <= 6; c++) {
                            const cell = wsSheet.getCell(imgR, c);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        }

                        for (let j = 0; j < rowImages.length; j++) {
                            const img = rowImages[j];
                            const base64 = imgToBase64.get(img);
                            const size = fittedSizes[j];
                            const colRange = getColumnRanges(j, imagesPerRow);

                            if (base64) {
                                const imageId = workbook.addImage({
                                    base64: base64,
                                    extension: img.extension || 'png'
                                });

                                let rangeWidth = 0;
                                for (let c = colRange.startNum; c < colRange.endNum; c++) {
                                    rangeWidth += colWidths[c];
                                }

                                const leftOffsetPx = Math.max(0, (rangeWidth - size.width) / 2);
                                const topOffsetPx = Math.max(0, (rowHeightPx - size.height) / 2);

                                const tlAnchor = getCellAndOffset(colRange.startNum, leftOffsetPx);

                                wsSheet.addImage(imageId, {
                                    tl: { 
                                        nativeCol: tlAnchor.col, 
                                        nativeColOff: tlAnchor.colOff,
                                        nativeRow: imgR - 1,
                                        nativeRowOff: Math.round(topOffsetPx * 9525)
                                    },
                                    ext: { width: size.width, height: size.height }
                                });
                            }
                        }

                        // Caption row
                        const captionRow = wsSheet.addRow([]);
                        const captionR = captionRow.number;
                        captionRow.height = 20;

                        for (let c = 1; c <= 6; c++) {
                            const cell = wsSheet.getCell(captionR, c);
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                        }

                        for (let j = 0; j < rowImages.length; j++) {
                            const img = rowImages[j];
                            const colRange = getColumnRanges(j, imagesPerRow);

                            wsSheet.mergeCells(`${colRange.start}${captionR}:${colRange.end}${captionR}`);
                            const captionCell = wsSheet.getCell(`${colRange.start}${captionR}`);
                            captionCell.value = `Ảnh ${i + j + 1}`;
                            captionCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF5D4037' } };
                            captionCell.alignment = { horizontal: 'center', vertical: 'middle' };

                            const startColNum = wsSheet.getColumn(colRange.start).number;
                            const endColNum = wsSheet.getColumn(colRange.end).number;
                            const borderStyle = {
                                thin: { style: 'thin', color: { argb: 'FFD7CCC8' } }
                            };

                            for (let r = imgR; r <= captionR; r++) {
                                for (let c = startColNum; c <= endColNum; c++) {
                                    const cell = wsSheet.getCell(r, c);
                                    cell.border = cell.border || {};
                                    if (r === imgR) cell.border.top = borderStyle.thin;
                                    if (r === captionR) cell.border.bottom = borderStyle.thin;
                                    if (c === startColNum) cell.border.left = borderStyle.thin;
                                    if (c === endColNum) cell.border.right = borderStyle.thin;
                                }
                            }
                        }

                        // Spacer row between card rows within the group
                        if (i + imagesPerRow < groupImages.length) {
                            const spacerRow = wsSheet.addRow([]);
                            const spacerR = spacerRow.number;
                            spacerRow.height = 12;
                            wsSheet.mergeCells(`A${spacerR}:F${spacerR}`);
                            for (let c = 1; c <= 6; c++) {
                                const cell = wsSheet.getCell(spacerR, c);
                                cell.border = {};
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                            }
                        }
                    }

                    // Spacer row after group
                    const groupEndSpacer = wsSheet.addRow([]);
                    groupEndSpacer.height = 12;
                    wsSheet.mergeCells(`A${groupEndSpacer.number}:F${groupEndSpacer.number}`);
                    for (let c = 1; c <= 6; c++) {
                        const cell = wsSheet.getCell(groupEndSpacer.number, c);
                        cell.border = {};
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                    }
                }

                wsSheet.addRow([]); // final spacer
                wsSheet.lastRow.height = 15;
            } else {
                // Grid layout: imagesPerRow images per row
                for (let i = 0; i < images.length; i += imagesPerRow) {
                    const rowImages = images.slice(i, i + imagesPerRow);
                    const rowBase64s = imageBase64s.slice(i, i + imagesPerRow);
                    
                    // Get fitted dimensions for all images in this row
                    const fittedSizes = [];
                    for (let j = 0; j < rowImages.length; j++) {
                        const base64 = rowBase64s[j];
                        if (base64) {
                            const dims = await getImageDimensions(base64);
                            const size = fitImage(dims.width, dims.height, 150, 100);
                            fittedSizes.push(size);
                        } else {
                            fittedSizes.push({ width: 150, height: 100 });
                        }
                    }

                    const imgRow = wsSheet.addRow([]);
                    const imgR = imgRow.number;
                    imgRow.height = 100; // Height for image

                    // Note: We do NOT call wsSheet.mergeCells for the image row cells anymore.
                    // This allows Excel to respect the precise colOff target positioning of getCellAndOffset.
                    // The solid white cell backgrounds hide the internal gridlines to preserve card aesthetics.

                    for (let j = 0; j < rowImages.length; j++) {
                        const img = rowImages[j];
                        const base64 = rowBase64s[j];
                        const size = fittedSizes[j];
                        const colRange = getColumnRanges(j, imagesPerRow);
                        
                        // Embed image
                        if (base64) {
                            const imageId = workbook.addImage({
                                base64: base64,
                                extension: img.extension || 'png'
                            });

                            // Calculate range width in pixels
                            let rangeWidth = 0;
                            for (let c = colRange.startNum; c < colRange.endNum; c++) {
                                rangeWidth += colWidths[c];
                            }

                            const leftOffsetPx = Math.max(0, (rangeWidth - size.width) / 2);
                            const topOffsetPx = Math.max(0, (rowHeightPx - size.height) / 2);

                            const tlAnchor = getCellAndOffset(colRange.startNum, leftOffsetPx);

                            wsSheet.addImage(imageId, {
                                tl: { 
                                    nativeCol: tlAnchor.col, 
                                    nativeColOff: tlAnchor.colOff,
                                    nativeRow: imgR - 1,
                                    nativeRowOff: Math.round(topOffsetPx * 9525)
                                },
                                ext: { width: size.width, height: size.height }
                            });
                        }
                    }

                    // Add caption row for all images in this row
                    const captionRow = wsSheet.addRow([]);
                    const captionR = captionRow.number;
                    captionRow.height = 20;
                    
                    for (let j = 0; j < rowImages.length; j++) {
                        const img = rowImages[j];
                        const colRange = getColumnRanges(j, imagesPerRow);
                        
                        wsSheet.mergeCells(`${colRange.start}${captionR}:${colRange.end}${captionR}`);
                        const captionCell = wsSheet.getCell(`${colRange.start}${captionR}`);
                        captionCell.value = img.description || `Ảnh ${i + j + 1}`;
                        captionCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF5D4037' } };
                        captionCell.alignment = { horizontal: 'center', vertical: 'middle' };

                        // Apply unified borders and shading (like a framed card)
                        const startColNum = wsSheet.getColumn(colRange.start).number;
                        const endColNum = wsSheet.getColumn(colRange.end).number;
                        const borderStyle = {
                            thin: { style: 'thin', color: { argb: 'FFD7CCC8' } } // Warm grey/brown border
                        };

                        for (let r = imgR; r <= captionR; r++) {
                            for (let c = startColNum; c <= endColNum; c++) {
                                const cell = wsSheet.getCell(r, c);
                                cell.border = cell.border || {};
                                
                                // Outer borders of card
                                if (r === imgR) cell.border.top = borderStyle.thin;
                                if (r === captionR) cell.border.bottom = borderStyle.thin;
                                if (c === startColNum) cell.border.left = borderStyle.thin;
                                if (c === endColNum) cell.border.right = borderStyle.thin;

                                // Horizontal divider between image and caption
                                if (r === imgR) cell.border.bottom = borderStyle.thin;
                                if (r === captionR) cell.border.top = borderStyle.thin;

                                // Background styling
                                if (r === captionR) {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFF9F6F0' } // Light cream for caption
                                    };
                                } else {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: 'FFFFFFFF' } // Pure white for image area
                                    };
                                }
                            }
                        }
                    }

                    // Add spacer row between rows of card grid to prevent them from sticking together vertically
                    if (i + imagesPerRow < images.length) {
                        const spacerRow = wsSheet.addRow([]);
                        const spacerR = spacerRow.number;
                        spacerRow.height = 15; // 15pt spacer height
                        wsSheet.mergeCells(`A${spacerR}:F${spacerR}`);
                        
                        for (let c = 1; c <= 6; c++) {
                            const cell = wsSheet.getCell(spacerR, c);
                            cell.border = {};
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFFFFF' }
                            };
                        }
                    }
                }

                wsSheet.addRow([]); // spacer
                wsSheet.lastRow.height = 15;
            }
        };

        const addSectionHeader = (wsSheet, title) => {
            const row = wsSheet.addRow([]);
            const r = row.number;
            wsSheet.mergeCells(`A${r}:F${r}`);
            
            for (let c = 1; c <= 6; c++) {
                const cell = wsSheet.getCell(r, c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF8D6E63' } },
                    left: { style: 'thin', color: { argb: 'FF8D6E63' } },
                    bottom: { style: 'medium', color: { argb: 'FF5D4037' } },
                    right: { style: 'thin', color: { argb: 'FF8D6E63' } }
                };
            }

            const firstCell = wsSheet.getCell(`A${r}`);
            firstCell.value = title;
            firstCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            firstCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            row.height = 28;
            return row;
        };

        const addKeyValueRow = (wsSheet, label, value, isNumber = false, isStatus = false, statusType = '') => {
            const row = wsSheet.addRow([]);
            const r = row.number;
            wsSheet.mergeCells(`A${r}:B${r}`);
            wsSheet.mergeCells(`C${r}:F${r}`);

            const cellA = wsSheet.getCell(`A${r}`);
            const cellB = wsSheet.getCell(`B${r}`);
            const cellC = wsSheet.getCell(`C${r}`);
            const cellD = wsSheet.getCell(`D${r}`);
            const cellE = wsSheet.getCell(`E${r}`);
            const cellF = wsSheet.getCell(`F${r}`);

            cellA.value = label;
            cellC.value = value === undefined || value === null ? "---" : value;

            // Calculate dynamic row height based on label text length (like SECTION 3)
            const labelText = String(label || "");
            const lines = Math.max(1, Math.ceil(labelText.length / 40));
            row.height = Math.max(22, lines * 18);

            // Label Styling
            [cellA, cellB].forEach(cell => {
                cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF2C3E50' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } };
                cell.alignment = { horizontal: 'left', vertical: 'top', indent: 1, wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
            });

            // Value Styling
            const valueCells = [cellC, cellD, cellE, cellF];
            valueCells.forEach(cell => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            });

            if (isNumber) {
                valueCells.forEach(cell => {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    if (typeof value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                });
            }

            if (isStatus && value) {
                const text = String(value).toLowerCase();
                let bg = 'FFE2F0D9'; // Light Green
                let fg = 'FF385723'; // Dark Green
                if (text.includes('không') || text.includes('hỏng') || text.includes('lỗi') || statusType === 'danger' || text.includes('kđ') || text.includes('không đạt')) {
                    bg = 'FFF8D7DA'; // Light Red
                    fg = 'FFC00000'; // Dark Red
                } else if (text.includes('chờ') || text.includes('đang') || statusType === 'warning') {
                    bg = 'FFFFF2CC'; // Light Yellow
                    fg = 'FF7F6000'; // Dark Yellow
                }
                valueCells.forEach(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
                    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: fg } };
                });
            }

            row.height = 24;
            return row;
        };

        const addPOHeader = (wsSheet) => {
            const headers = ["STT", "Số PO đối tác", "Mã đơn hàng", "Khách hàng", "Sản phẩm đơn hàng", "Số lượng"];
            const row = wsSheet.addRow(headers);
            row.height = 26;
            row.eachCell((cell) => {
                cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA1887F' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                    bottom: { style: 'medium', color: { argb: 'FF8D6E63' } },
                    right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
                };
            });
            return row;
        };

        const addPODatRow = (wsSheet, data, idx) => {
            const isEven = idx % 2 === 1;
            const row = wsSheet.addRow(data);
            
            // Calculate dynamic height based on Col E (Product Names, width ~32)
            const productNames = String(data[4] || "");
            const lines = Math.max(1, Math.ceil(productNames.length / 28));
            row.height = Math.max(22, lines * 15);

            row.eachCell((cell, colNum) => {
                cell.font = { name: 'Segoe UI', size: 9.5 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }

                if (colNum === 1) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (colNum === 6) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    cell.numFmt = '#,##0';
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                }
            });
            return row;
        };

        const addDefectsHeader = (wsSheet) => {
            const row = wsSheet.addRow([]);
            const r = row.number;
            wsSheet.mergeCells(`B${r}:C${r}`);

            const cellA = wsSheet.getCell(`A${r}`);
            const cellB = wsSheet.getCell(`B${r}`);
            const cellC = wsSheet.getCell(`C${r}`);
            const cellD = wsSheet.getCell(`D${r}`);
            const cellE = wsSheet.getCell(`E${r}`);
            const cellF = wsSheet.getCell(`F${r}`);

            cellA.value = "STT";
            cellB.value = "Hạng mục lỗi";
            cellD.value = "Mức độ";
            cellE.value = "Số lượng lỗi";
            cellF.value = "Ghi chú";

            const headerCells = [cellA, cellB, cellC, cellD, cellE, cellF];
            headerCells.forEach(cell => {
                cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA1887F' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
                    bottom: { style: 'medium', color: { argb: 'FF8D6E63' } },
                    right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
                };
            });

            row.height = 26;
            return row;
        };

        const addDefectDataRow = (wsSheet, idx, name, severity, quantity, note) => {
            const row = wsSheet.addRow([]);
            const r = row.number;
            wsSheet.mergeCells(`B${r}:C${r}`);

            const cellA = wsSheet.getCell(`A${r}`);
            const cellB = wsSheet.getCell(`B${r}`);
            const cellC = wsSheet.getCell(`C${r}`);
            const cellD = wsSheet.getCell(`D${r}`);
            const cellE = wsSheet.getCell(`E${r}`);
            const cellF = wsSheet.getCell(`F${r}`);

            cellA.value = idx;
            cellB.value = name || "Lỗi không xác định";
            cellD.value = severity || "Nhẹ";
            cellE.value = quantity || 0;
            cellF.value = note || "---";

            // Calculate dynamic height based on note and name lengths
            const maxLen = Math.max(String(cellB.value).length, String(cellF.value).length);
            const lines = Math.max(1, Math.ceil(maxLen / 24));
            row.height = Math.max(22, lines * 15);

            const isEven = idx % 2 === 1;
            const dataCells = [cellA, cellB, cellC, cellD, cellE, cellF];
            dataCells.forEach(cell => {
                cell.font = { name: 'Segoe UI', size: 9.5 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }
            });

            cellA.alignment = { horizontal: 'center', vertical: 'middle' };
            cellB.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            cellC.alignment = { horizontal: 'left', vertical: 'middle' };
            cellD.alignment = { horizontal: 'center', vertical: 'middle' };
            cellE.alignment = { horizontal: 'right', vertical: 'middle' };
            cellE.numFmt = '#,##0';
            cellF.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

            const sevText = String(severity || "").toLowerCase();
            if (sevText.includes("nặng") || sevText.includes("nghiêm trọng") || sevText.includes("critical")) {
                cellD.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC00000' } };
                cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
            } else if (sevText.includes("trung bình") || sevText.includes("vừa") || sevText.includes("major")) {
                cellD.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF7F6000' } };
                cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
            }

            row.height = 22;
            return row;
        };

        const addEmptyTablePlaceholder = (wsSheet, message) => {
            const row = wsSheet.addRow([]);
            const r = row.number;
            wsSheet.mergeCells(`A${r}:G${r}`);
            for (let c = 1; c <= 7; c++) {
                const cell = wsSheet.getCell(r, c);
                cell.value = message;
                cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF7F7F7F' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
            }
            row.height = 30;
            return row;
        };

        // --- 1. MAIN TITLE ---
        ws.mergeCells('A1:F1');
        for (let c = 1; c <= 6; c++) {
            const cell = ws.getCell(1, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
        }
        const titleCell = ws.getCell('A1');
        titleCell.value = `THÔNG TIN CHI TIẾT PHIẾU BÀN GIAO BG-${deliveryDetail.id}`;
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 40;

        // Subtitle row
        ws.mergeCells('A2:F2');
        for (let c = 1; c <= 6; c++) {
            const cell = ws.getCell(2, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8D6E63' } };
        }
        const subtitleCell = ws.getCell('A2');
        subtitleCell.value = `Báo cáo xuất ngày: ${new Date().toLocaleString('vi-VN')} | Hệ thống SmartFlow`;
        subtitleCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFD9E1F2' } };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(2).height = 20;

        ws.addRow([]); // Blank spacer (Row 3)
        ws.getRow(3).height = 10;

        // --- SECTION 1. THÔNG TIN CHUNG ---
        addSectionHeader(ws, "1. THÔNG TIN CHUNG");
        addKeyValueRow(ws, "Mã phiếu", `BG-${deliveryDetail.id}`);
        addKeyValueRow(ws, "Linh kiện / Tên chi tiết", deliveryDetail.part_name || "");
        addKeyValueRow(ws, "Quy cách kỹ thuật", deliveryDetail.specification || "");
        addKeyValueRow(ws, "Kế hoạch sản xuất", deliveryDetail.plan_name || (deliveryDetail.plan_id ? `KH-${deliveryDetail.plan_id}` : "---"));
        addKeyValueRow(ws, "Công đoạn vận chuyển", `${deliveryDetail.delivery_stage || ""} ➔ ${deliveryDetail.receiving_stage || ""}`);
        addKeyValueRow(ws, "Thời gian lập", deliveryDetail.created_at ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') : "---");
        addKeyValueRow(ws, "Người thực hiện giao", deliveryDetail.sx_delivery_name || "---");
        addKeyValueRow(ws, "Người tiếp nhận", deliveryDetail.sx_receipt_name || "---");
        addKeyValueRow(ws, "Ghi chú bàn giao", deliveryDetail.note || "Không có");

        // Add handover images to Section 1 (filter to show only handover images, not QC)
        const handoverImages = deliveryDetail.images 
            ? deliveryDetail.images
                .filter(img => {
                    const isQC = img.description?.startsWith('qc_');
                    return !isQC;
                })
                .map(img => ({
                    url: `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(img.image_path.replace(/^\//, ''))}`,
                    description: img.description || 'Ảnh',
                    extension: img.image_path.split('.').pop() || 'png'
                }))
            : [];
        await addImageSection(ws, handoverImages, "Ảnh minh chứng giao", 3);
        
        ws.addRow([]); // spacer
        ws.lastRow.height = 15;

        // --- SECTION 2. SỐ LƯỢNG THỰC TẾ ---
        addSectionHeader(ws, "2. SỐ LƯỢNG THỰC TẾ");
        addKeyValueRow(ws, "SL Giao Tổng", deliveryDetail.quantity_total || 0, true);
        addKeyValueRow(ws, "SL Thực Nhận", deliveryDetail.quantity_received || 0, true);
        addKeyValueRow(ws, "SL Trả Lại (QC)", deliveryDetail.quantity_returned || 0, true);
        addKeyValueRow(ws, "SL Lỗi (QC)", deliveryDetail.quantity_error || 0, true);
        addKeyValueRow(ws, "SL Thực Kiểm (QC)", deliveryDetail.quantity_inspection || 0, true);
        addKeyValueRow(ws, "Phế Phẩm / Dư", deliveryDetail.residual || 0, true);

        ws.addRow([]); // spacer
        ws.lastRow.height = 15;

        // --- SECTION 3. PHÂN BỐ ĐƠN HÀNG (PO CHI TIẾT) ---
        addSectionHeader(ws, "3. PHÂN BỐ ĐƠN HÀNG (PO CHI TIẾT)");
        addPOHeader(ws);
        if (deliveryDetail.details && deliveryDetail.details.length > 0) {
            deliveryDetail.details.forEach((detail, idx) => {
                addPODatRow(ws, [
                    idx + 1,
                    detail.partner_po || "---",
                    detail.order_code || "---",
                    detail.customer || "---",
                    detail.product_names || "---",
                    detail.quantity || 0
                ], idx);
            });
        } else {
            addEmptyTablePlaceholder(ws, "Không có thông tin phân bổ PO cụ thể");
        }

        ws.addRow([]); // spacer
        ws.lastRow.height = 15;

        // --- SECTION 4. KẾT QUẢ KIỂM TRA QC (ĐẦU CUỐI) ---
        addSectionHeader(ws, "4. KẾT QUẢ KIỂM TRA QC (ĐẦU CUỐI)");
        if (qcDetail && qcDetail.qc_info) {
            let qcResults = {};
            try {
                qcResults = typeof qcDetail.qc_info.results_json === 'string'
                    ? JSON.parse(qcDetail.qc_info.results_json)
                    : (qcDetail.qc_info.results_json || {});
            } catch (e) {
                // Thầm lặng bỏ qua lỗi parse kết quả kiểm định
            }

            const isFailed = deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối';
            const conclusionText = isFailed ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG';
            const inspectedAt = qcDetail.qc_info.created_at 
                ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') 
                : "---";
            
            const moistureMax = qcResults.moisture?.max !== undefined && qcResults.moisture?.max !== null 
                ? `${qcResults.moisture.max}%` 
                : "---";
            const moistureMin = qcResults.moisture?.min !== undefined && qcResults.moisture?.min !== null 
                ? `${qcResults.moisture.min}%` 
                : "---";
            const qcNote = qcDetail.qc_info.note || "Không có ghi chú kiểm định chất lượng.";

            addKeyValueRow(ws, "Kết luận", conclusionText, false, true);
            addKeyValueRow(ws, "Người kiểm định", deliveryDetail.qc_receipt_name || "---");
            addKeyValueRow(ws, "Thời gian kiểm định", inspectedAt);
            addKeyValueRow(ws, "Độ ẩm lớn nhất", moistureMax);
            addKeyValueRow(ws, "Độ ẩm nhỏ nhất", moistureMin);
            addKeyValueRow(ws, "Ghi chú QC đầu cuối", qcNote);
            
            const subTitleRow = ws.addRow([]);
            const sr = subTitleRow.number;
            ws.mergeCells(`A${sr}:F${sr}`);
            const subTitleCell = ws.getCell(`A${sr}`);
            subTitleCell.value = "Danh sách lỗi phát hiện:";
            subTitleCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF8D6E63' } };
            subTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
            subTitleRow.height = 24;

            addDefectsHeader(ws);
            if (qcDetail.defect_logs && qcDetail.defect_logs.length > 0) {
                qcDetail.defect_logs.forEach((log, idx) => {
                    addDefectDataRow(
                        ws, 
                        idx + 1, 
                        log.defect_name, 
                        log.severity, 
                        log.quantity, 
                        log.note
                    );
                });
            } else {
                addEmptyTablePlaceholder(ws, "Không phát hiện lỗi chất lượng nào");
            }

            // Add QC images section
            const qcImages = qcDetail.images 
                ? qcDetail.images.map(img => ({
                    url: `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(img.image_path.replace(/^\//, ''))}`,
                    description: getCategoryLabel(img.description),
                    extension: img.image_path.split('.').pop() || 'png'
                }))
                : [];
            await addImageSection(ws, qcImages, "Ảnh kiểm tra QC", 3, true);
        } else {
            addEmptyTablePlaceholder(ws, "Chưa có kết quả kiểm tra QC đầu cuối cho phiếu này");
        }

        ws.addRow([]); // spacer
        ws.lastRow.height = 15;

        // --- SECTION 5. KẾT QUẢ KIỂM TRA QC (ĐẦU VÀO) ---
        addSectionHeader(ws, "5. KẾT QUẢ KIỂM TRA QC (ĐẦU VÀO)");
        if (inputQcDetail) {
            addKeyValueRow(ws, "Kết luận", inputQcDetail.result || "---", false, true);
            addKeyValueRow(ws, "Người kiểm định", inputQcDetail.inspector_name || "---");
            addKeyValueRow(ws, "Thời gian kiểm định", inputQcDetail.inspected_at ? new Date(inputQcDetail.inspected_at).toLocaleString('vi-VN') : "---");
            addKeyValueRow(ws, "Mã Container", inputQcDetail.cont_name || "---");
            addKeyValueRow(ws, "Kích thước (Dày x Rộng x Dài)", `${height || "---"} x ${width || "---"} x ${length || "---"} mm`);
            addKeyValueRow(ws, "Ghi chú QC đầu vào", inputQcDetail.note || "Không có ghi chú.");

            // Add input QC images section
            const inputQcImages = [inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3]
                .filter(Boolean)
                .map((imgUrl, idx) => ({
                    url: `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(imgUrl.replace(/^\//, ''))}`,
                    description: `Ảnh kiểm định ${idx + 1}`,
                    extension: imgUrl.split('.').pop() || 'png'
                }));
            await addImageSection(ws, inputQcImages, "Ảnh kiểm định đầu vào", 3);
        } else {
            addEmptyTablePlaceholder(ws, "Không có thông tin kiểm định chất lượng đầu vào của công đoạn tiếp theo");
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Chi_tiet_ban_giao_BG_${deliveryDetail.id}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 100);
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
                const data = await response.json();
                if (data && data.base64) {
                    const ext = data.extension || 'png';
                    return `data:image/${ext};base64,${data.base64}`;
                }
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


    return (
        <div className="manufacture-plan-container">
            
            {/* ── STICKY TOP ZONE (Desktop: filters + stats-grid; Mobile: stats-strip + filters) ── */}
            <div className="sticky-top-zone">
                {/* Desktop/Mobile Toolbar filters */}
                <PageToolbar
                    searchValue={searchTerm}
                    onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                    searchPlaceholder="Tìm kiếm phiếu, chi tiết..."
                    showFilter={true}
                    isFilterOpen={isFilterBarOpen}
                    onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
                    activeFiltersCount={2}
                    onExport={handleExportExcel}
                    exportLabel="Xuất Excel"
                    hasWritePermission={true}
                />

                {isFilterBarOpen && (
                    <div className="filter-inline-bar">
                        {/* Lọc theo tháng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Tháng</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}
                            >
                                {months.map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Lọc theo năm */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Năm</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    const nextYear = parseInt(e.target.value);
                                    setSelectedYear(nextYear);
                                    const nextMonths = availableDates[nextYear] || [];
                                    if (nextMonths.length > 0 && !nextMonths.includes(selectedMonth)) {
                                        setSelectedMonth(nextMonths[0]);
                                    }
                                    setCurrentPage(1);
                                }}
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>Năm {y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Hiển thị số dòng */}
                        <div className="filter-field-group">
                            <label className="filter-field-label">Hiển thị số dòng</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Desktop Stats Grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ marginTop: '0', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    {[
                        { id: 'all', label: 'TỔNG SỐ PHIẾU', value: stats.total, iconBg: '#FAF6F0', iconColor: '#7B5233', themeColor: '#7B5233', activeBg: '#FAF6F0', Icon: Layers },
                        { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: stats.completed, iconBg: '#ECFDF5', iconColor: '#059669', themeColor: '#059669', activeBg: '#F6FDF9', Icon: CheckCircle },
                        { id: 'pending', label: 'ĐANG CHỜ NHẬN', value: stats.pending, iconBg: '#FFFBEB', iconColor: '#D97706', themeColor: '#D97706', activeBg: '#FFFDF5', Icon: Clock },
                        { id: 'error', label: 'PHIẾU LỖI/TRẢ', value: stats.error, iconBg: '#FFF1F2', iconColor: '#E11D48', themeColor: '#E11D48', activeBg: '#FFF5F6', Icon: AlertCircle },
                    ].map((stat, i) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={i} 
                                className="kpi-card" 
                                style={{ 
                                    background: isActive ? stat.activeBg : '#fff', 
                                    border: '1px solid ' + (isActive ? stat.themeColor : '#E2E8F0'),
                                    padding: '8px 12px', 
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    boxShadow: isActive ? `0 0 0 2px ${stat.themeColor}20` : '0 1px 2px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <div style={{
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '8px',
                                    backgroundColor: stat.iconBg,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: stat.iconColor, 
                                    flexShrink: 0
                                }}>
                                    <stat.Icon size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
                                        {new Intl.NumberFormat('vi-VN').format(stat.value)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile Stats Strip */}
                <div className="stats-strip mobile-only">
                    {[
                        { id: 'all', label: 'TỔNG PHIẾU', value: stats.total, color: '#424242' },
                        { id: 'completed', label: 'HOÀN THÀNH', value: stats.completed, color: '#2E7D32' },
                        { id: 'pending', label: 'CHỜ NHẬN', value: stats.pending, color: '#E65100' },
                        { id: 'error', label: 'LỖI/TRẢ', value: stats.error, color: '#C62828' }
                    ].map((stat, idx) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={idx} 
                                className={`stats-strip-item ${isActive ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: isActive ? stat.color : '#fff',
                                    cursor: 'pointer'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <span className="strip-value" style={{ color: isActive ? '#fff' : stat.color }}>
                                    {stat.value}
                                </span>
                                <span className="strip-label" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#8D6E63' }}>
                                    {stat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Desktop list block */}
            <div className="admin-list-layout">
                <div className="mgmt-table card admin-table-card">
                    <div className="table-responsive desktop-only admin-table-scroll">
                        <table className="manufacture-table data-table" style={{ minWidth: '1300px' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center' }}>STT</th>
                                    <th>Mã phiếu</th>
                                    <th>Tên chi tiết</th>
                                    <th>Công đoạn vào</th>
                                    <th>Công đoạn ra</th>
                                    <th>SL Giao</th>
                                    <th>SL Nhận</th>
                                    <th>SL Trả</th>
                                    <th>Trạng thái</th>
                                    <th>Thời gian</th>
                                    <th>Người giao</th>
                                    <th>Người nhận</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Đang tải dữ liệu...</td></tr>
                                ) : filteredDeliveries.length === 0 ? (
                                    <tr><td colSpan="13" style={{ padding: '50px', textAlign: 'center', color: '#757575' }}>Không có dữ liệu bàn giao.</td></tr>
                                ) : filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => {
                                    const statusInfo = getStatusStyle(row.status);
                                    return (
                                        <tr 
                                            key={row.id} 
                                            className="animate-card-entrance"
                                            style={{
                                                position: 'relative',
                                                zIndex: actionMenuId === row.id ? 30 : 1
                                            }}
                                        >
                                            <td data-label="STT" style={{ textAlign: 'center' }}>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                                            <td data-label="Mã phiếu" style={{ fontWeight: '700', color: '#3E2723' }}>BG-{row.id}</td>
                                            <td data-label="Tên chi tiết" style={{ color: '#424242' }}>{row.part_name || 'N/A'}</td>
                                            <td data-label="Công đoạn vào">{row.delivery_stage}</td>
                                            <td data-label="Công đoạn ra">{row.receiving_stage}</td>
                                            <td data-label="SL Giao" style={{ fontWeight: '800' }}>{row.quantity_total}</td>
                                            <td data-label="SL Nhận" style={{ fontWeight: '800', color: '#2E7D32' }}>{row.quantity_received}</td>
                                            <td data-label="SL Trả" style={{ color: row.quantity_returned > 0 ? '#C62828' : '#757575' }}>{row.quantity_returned}</td>
                                            <td data-label="Trạng thái" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <span style={{ 
                                                    padding: '5px 10px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '11px', 
                                                    background: statusInfo.bg, 
                                                    color: statusInfo.color, 
                                                    fontWeight: '800',
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    border: `1px solid ${statusInfo.color}20`
                                                }}>
                                                    <span style={{ 
                                                        width: '6px', 
                                                        height: '6px', 
                                                        borderRadius: '50%', 
                                                        backgroundColor: statusInfo.color,
                                                        display: 'inline-block'
                                                    }}></span>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td data-label="Thời gian" style={{ fontSize: '12px', color: '#757575' }}>
                                                {row.created_at ? new Date(row.created_at).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A'}
                                            </td>
                                            <td data-label="Người giao">{row.sx_delivery_name || 'N/A'}</td>
                                            <td data-label="Người nhận">{row.sx_receipt_name || '---'}</td>
                                            <td data-label="Thao tác" style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === row.id ? 40 : 1 }}>
                                                <button
                                                    className="action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActionMenuId(actionMenuId === row.id ? null : row.id);
                                                    }}
                                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                                {actionMenuId === row.id && (
                                                    <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                                        <button
                                                            className="action-menu-item"
                                                            onClick={() => {
                                                                setActionMenuId(null);
                                                                handleOpenDetailModal(row);
                                                            }}
                                                        >
                                                            Chi tiết
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="admin-pagination-desktop">
                        <div style={{ fontSize: '14px', color: '#424242' }}>
                            Hiển thị <b>{filteredDeliveries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredDeliveries.length)}</b> trên <b>{filteredDeliveries.length}</b> kết quả
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                &lt; Trước
                            </button>
                            {(() => {
                                const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage) || 1;
                                const maxVisible = 5;
                                let start = Math.max(1, currentPage - 2);
                                let end = Math.min(totalPages, start + maxVisible - 1);
                                if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
                                
                                const pages = [];
                                for (let i = start; i <= end; i++) {
                                    pages.push(
                                        <button 
                                            key={i} 
                                            className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(i)}
                                        >
                                            {i}
                                        </button>
                                    );
                                }
                                return pages;
                            })()}
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredDeliveries.length / itemsPerPage) || 1, prev + 1))}
                                disabled={currentPage >= (Math.ceil(filteredDeliveries.length / itemsPerPage) || 1)}
                            >
                                Sau &gt;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile list view */}
            <div className="mobile-only manufacture-cards-scroll">
                <div className="manufacture-cards-container">
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu bàn giao.</div>
                    ) : (
                        filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row) => {
                            const statusInfo = getStatusStyle(row.status);
                            let cardStatusClass = 'pending';
                            if (statusInfo.label === 'HOÀN THÀNH') cardStatusClass = 'completed';
                            else if (statusInfo.label === 'LỖI/TRẢ') cardStatusClass = 'overdue';
                            
                            return (
                                <div 
                                    key={row.id} 
                                    className={`plan-mobile-card status-${cardStatusClass} card-shadow animate-card-entrance`} 
                                    onClick={() => handleOpenDetailModal(row)}
                                >
                                    <div className="card-header">
                                        <span className="card-khsx" style={{ fontWeight: '800' }}>BG-{row.id}</span>
                                        <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2D1A12' }}>
                                            {row.part_name || 'N/A'}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                            <span>Giao: {row.delivery_stage} ({row.quantity_total})</span>
                                            <span>Nhận: {row.receiving_stage} ({row.quantity_received})</span>
                                        </div>
                                        {row.quantity_returned > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: '#C62828', fontWeight: '700', marginTop: '2px' }}>
                                                Trả lại: {row.quantity_returned} chiếc
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #FAF6F0', paddingTop: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#9E9E9E', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} color="#8D6E63" /> 
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString('vi-VN') : '---'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: '700' }}>Chi tiết ›</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mobile Sticky Pagination */}
            <div className="pagination-mobile-sticky mobile-only">
                <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {Math.ceil(filteredDeliveries.length / itemsPerPage) || 1}</span>
                <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredDeliveries.length / itemsPerPage)))} disabled={currentPage >= Math.ceil(filteredDeliveries.length / itemsPerPage)}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Modal Overlay / Backdrop - Desktop only */}
            {isDetailModalOpen && (
                <div 
                    className="modal-backdrop desktop-only" 
                    style={{ 
                        position: 'fixed', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        backgroundColor: 'rgba(45, 26, 18, 0.55)', 
                        backdropFilter: 'blur(5px)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        zIndex: 1100, 
                        padding: '20px' 
                    }}
                    onClick={handleCloseDetailModal}
                >
                    <div 
                        className="modal-container" 
                        style={{ 
                            background: '#FFFFFF', 
                            width: '800px', 
                            maxWidth: '95%', 
                            height: '70vh', 
                            maxHeight: '620px', 
                            borderRadius: '20px', 
                            boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            overflow: 'hidden',
                            opacity: 1
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ 
                            background: 'linear-gradient(135deg, #2D1A12 0%, #5D4037 100%)', 
                            padding: '16px 24px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            color: 'white' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(255, 255, 255, 0.15)', 
                                    fontSize: '13px', 
                                    fontWeight: '800', 
                                    letterSpacing: '0.5px' 
                                }}>
                                    PHIẾU BG-{selectedDelivery?.id}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>
                                    {selectedDelivery?.part_name || 'Chi tiết bàn giao'}
                                </h3>
                            </div>
                            <button 
                                onClick={handleCloseDetailModal} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'white', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    padding: '6px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'rgba(255,255,255,0.1)', 
                                    transition: 'background 0.2s' 
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Tabs Bar */}
                        <div style={{ 
                            display: 'flex', 
                            borderBottom: '1px solid #EADCC9', 
                            background: '#FAF8F6', 
                            padding: '0 16px' 
                        }}>
                            <button 
                                onClick={() => setModalTab('handover')}
                                style={{ 
                                    padding: '16px 20px', 
                                    background: 'none', 
                                    border: 'none', 
                                    borderBottom: modalTab === 'handover' ? '3px solid #7B5233' : '3px solid transparent', 
                                    color: modalTab === 'handover' ? '#7B5233' : '#757575', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Layers size={16} />
                                Bàn Giao & PO
                            </button>
                            <button 
                                onClick={() => setModalTab('qc_end')}
                                style={{ 
                                    padding: '16px 20px', 
                                    background: 'none', 
                                    border: 'none', 
                                    borderBottom: modalTab === 'qc_end' ? '3px solid #7B5233' : '3px solid transparent', 
                                    color: modalTab === 'qc_end' ? '#7B5233' : '#757575', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <CheckCircle2 size={16} />
                                Kết Quả Kiểm Tra QC (Đầu Cuối)
                            </button>
                            <button 
                                onClick={() => setModalTab('qc_start')}
                                style={{ 
                                    padding: '16px 20px', 
                                    background: 'none', 
                                    border: 'none', 
                                    borderBottom: modalTab === 'qc_start' ? '3px solid #7B5233' : '3px solid transparent', 
                                    color: modalTab === 'qc_start' ? '#7B5233' : '#757575', 
                                    fontWeight: '700', 
                                    fontSize: '14px', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <FileText size={16} />
                                Kết Quả Kiểm Tra QC (Đầu Vào)
                            </button>
                        </div>

                        {/* Modal Body Container */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#FDFBF9' }}>
                            {modalLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                                    <div className="spinner"></div>
                                    <span style={{ fontSize: '13px', color: '#8D6E63', fontWeight: '700' }}>Đang tải thông tin chi tiết...</span>
                                </div>
                            ) : modalTab === 'handover' ? (
                                <div>
                                    {/* 1. General Info Grid */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        THÔNG TIN CHUNG
                                    </h4>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                        gap: '16px', 
                                        marginBottom: '24px',
                                        background: 'white',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid #EADCC9'
                                    }}>
                                        {[
                                            { label: 'Mã phiếu', value: `BG-${deliveryDetail?.id}`, icon: <FileText size={16} color="#8D6E63" /> },
                                            { label: 'Linh kiện/Tên chi tiết', value: deliveryDetail?.part_name || 'N/A', icon: <Layers size={16} color="#8D6E63" /> },
                                            { label: 'Quy cách kỹ thuật', value: deliveryDetail?.specification || '---', icon: <Info size={16} color="#8D6E63" /> },
                                            { label: 'Kế hoạch sản xuất', value: deliveryDetail?.plan_name || (deliveryDetail?.plan_id ? `KH-${deliveryDetail.plan_id}` : '---'), icon: <FileSpreadsheet size={16} color="#8D6E63" /> },
                                            { label: 'Công đoạn vận chuyển', value: `${deliveryDetail?.delivery_stage || '---'} ➔ ${deliveryDetail?.receiving_stage || '---'}`, icon: <MapPin size={16} color="#8D6E63" /> },
                                            { label: 'Thời gian lập', value: deliveryDetail?.created_at ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') : '---', icon: <Calendar size={16} color="#8D6E63" /> },
                                            { label: 'Người thực hiện giao', value: deliveryDetail?.sx_delivery_name || 'N/A', icon: <User size={16} color="#8D6E63" /> },
                                            { label: 'Người tiếp nhận', value: deliveryDetail?.sx_receipt_name || '---', icon: <User size={16} color="#8D6E63" /> },
                                            { label: 'Mã QR dự phòng', value: deliveryDetail?.backup_qr || 'Không có', icon: <Activity size={16} color="#8D6E63" /> },
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ marginTop: '3px' }}>{item.icon}</div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                                                    <div style={{ fontSize: '13px', color: '#2D1A12', fontWeight: '800', marginTop: '2px' }}>{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid #FAF6F0', paddingTop: '10px' }}>
                                            <div style={{ marginTop: '2px' }}><Info size={16} color="#8D6E63" /></div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú bàn giao</div>
                                                <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                                                    {deliveryDetail?.note || 'Không có ghi chú nào từ công đoạn giao.'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Quantities Grid */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        SỐ LƯỢNG THỰC TẾ
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                                        {[
                                            { label: 'SL GIAO TỔNG', value: deliveryDetail?.quantity_total, color: '#7B5233', bg: '#FAF6F0' },
                                            { label: 'SL THỰC NHẬN', value: deliveryDetail?.quantity_received, color: '#2E7D32', bg: '#E8F5E9' },
                                            { label: 'SL TRẢ LẠI (QC)', value: deliveryDetail?.quantity_returned, color: '#C62828', bg: '#FFEBEE' },
                                            { label: 'SL LỖI (QC)', value: deliveryDetail?.quantity_error, color: '#EF6C00', bg: '#FFF3E0' },
                                            { label: 'SL THỰC KIỂM (QC)', value: deliveryDetail?.quantity_inspection || 0, color: '#1565C0', bg: '#E3F2FD' },
                                            { label: 'PHẾ PHẨM / DƯ', value: deliveryDetail?.residual || 0, color: '#616161', bg: '#F5F5F5' },
                                        ].map((qty, idx) => (
                                            <div key={idx} style={{ 
                                                background: qty.bg, 
                                                padding: '12px', 
                                                borderRadius: '10px', 
                                                textAlign: 'center',
                                                border: `1px solid ${qty.color}20`
                                            }}>
                                                <div style={{ fontSize: '10px', color: '#757575', fontWeight: '800', letterSpacing: '0.5px' }}>{qty.label}</div>
                                                <div style={{ fontSize: '20px', fontWeight: '900', color: qty.color, marginTop: '5px' }}>{qty.value !== null ? qty.value : '---'}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3. PO allocation details */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        PHÂN BỔ ĐƠN HÀNG (FIFO / PO CHI TIẾT)
                                    </h4>
                                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', overflow: 'hidden', marginBottom: '24px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#FAF6F0', textAlign: 'left', borderBottom: '1px solid #EADCC9' }}>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800', width: '50px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Số PO đối tác</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Mã đơn hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Khách hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>Sản phẩm đơn hàng</th>
                                                    <th style={{ padding: '10px 12px', fontSize: '12px', color: '#5D4037', fontWeight: '800', textAlign: 'right' }}>Số lượng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {!deliveryDetail?.details || deliveryDetail.details.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#8D6E63', fontWeight: '700', fontStyle: 'italic' }}>
                                                            Không có thông tin phân bổ PO cụ thể (Hàng dư thừa ngoài kế hoạch hoặc không liên kết đơn hàng).
                                                        </td>
                                                    </tr>
                                                ) : deliveryDetail.details.map((detail, dIdx) => (
                                                    <tr key={detail.id || dIdx} style={{ borderBottom: '1px solid #FAF6F0' }}>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'center' }}>{dIdx + 1}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', color: '#7B5233' }}>{detail.partner_po || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '700' }}>{detail.order_code || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>{detail.customer || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#555' }}>{detail.product_names || '---'}</td>
                                                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '800', textAlign: 'right', color: '#2D1A12' }}>{detail.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 4. Handover evidence images */}
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                        ẢNH MINH CHỨNG BÀN GIAO
                                    </h4>
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '12px', 
                                        flexWrap: 'wrap', 
                                        background: 'white', 
                                        padding: '16px', 
                                        borderRadius: '12px', 
                                        border: '1px solid #EADCC9' 
                                    }}>
                                        {!deliveryDetail?.images || deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).length === 0 ? (
                                            <span style={{ fontSize: '13px', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh bàn giao nào được tải lên.</span>
                                        ) : (
                                            deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).map((img, imgIdx) => {
                                                const url = img.image_path.startsWith('http') ? img.image_path : `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(img.image_path.replace(/^\//, ''))}`;
                                                return (
                                                    <div 
                                                        key={imgIdx} 
                                                        onClick={() => setActiveImage(url)}
                                                        style={{ 
                                                            width: '120px', 
                                                            height: '90px', 
                                                            borderRadius: '8px', 
                                                            overflow: 'hidden', 
                                                            border: '1px solid #EADCC9', 
                                                            cursor: 'zoom-in',
                                                            position: 'relative',
                                                            transition: 'transform 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <img src={url} alt={img.description || 'Handover Proof'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(45,26,18,0.75)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0' }}>
                                                            {img.description || 'Ảnh giao'}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : modalTab === 'qc_end' ? (
                                <div>
                                    {/* Tab QC inspection results */}
                                    {!qcDetail || !qcDetail.qc_info ? (
                                        <div style={{ 
                                            background: '#FAF6F0', 
                                            border: '2px dashed #EADCC9', 
                                            borderRadius: '16px', 
                                            padding: '40px', 
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '15px'
                                        }}>
                                            <AlertCircle size={48} color="#D97706" />
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#5D4037' }}>
                                                Chưa có thông tin kiểm định chất lượng (QC)
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#8D6E63', maxWidth: '450px', lineHeight: '1.5' }}>
                                                Phiếu này chưa được QC tiếp nhận đo đạc chất lượng hoặc đang trong quá trình kiểm tra. Các số liệu độ ẩm, độ cong, kích thước và ảnh lỗi sẽ xuất hiện tại đây sau khi lưu.
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* 1. QC General Info */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '16px', 
                                                marginBottom: '24px',
                                                background: 'white',
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: '1px solid #EADCC9'
                                            }}>
                                                {[
                                                    { label: 'Người kiểm định QC', value: deliveryDetail?.qc_receipt_name || 'N/A', icon: <User size={16} color="#8D6E63" /> },
                                                    { label: 'Thời gian kiểm định', value: qcDetail.qc_info.created_at ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') : '---', icon: <Calendar size={16} color="#8D6E63" /> },
                                                    { 
                                                        label: 'KẾT LUẬN QC CHUNG', 
                                                        value: (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối') ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG', 
                                                        color: (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi' || deliveryDetail?.status === 'Từ chối') ? '#C62828' : '#2E7D32',
                                                        icon: <Activity size={16} color="#8D6E63" /> 
                                                    },
                                                ].map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <div style={{ marginTop: '3px' }}>{item.icon}</div>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                                                            <div style={{ fontSize: '13px', color: item.color || '#2D1A12', fontWeight: '800', marginTop: '2px' }}>{item.value}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid #FAF6F0', paddingTop: '10px' }}>
                                                    <div style={{ marginTop: '2px' }}><Info size={16} color="#8D6E63" /></div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú kiểm định QC</div>
                                                        <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                                                            {qcDetail.qc_info.note || 'Không có ghi chú kiểm định chất lượng.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Detailed QC Items Checklists */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                CHI TIẾT CÁC HẠNG MỤC KIỂM TRA ĐẦU CUỐI
                                            </h4>
                                            
                                            {(() => {
                                                let results = {};
                                                try {
                                                    results = typeof qcDetail.qc_info.results_json === 'string' 
                                                        ? JSON.parse(qcDetail.qc_info.results_json) 
                                                        : (qcDetail.qc_info.results_json || {});
                                                } catch (e) {
                                                    // Thầm lặng bỏ qua lỗi parse kết quả kiểm định
                                                }

                                                const getPassBadge = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#F5F5F5', color: '#757575', fontWeight: '700' }}>CHƯA KIỂM</span>;
                                                    return isPass ? (
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#E8F5E9', color: '#2E7D32', fontWeight: '800' }}>ĐẠT</span>
                                                    ) : (
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', background: '#FFEBEE', color: '#C62828', fontWeight: '800' }}>HỎNG/LỖI</span>
                                                    );
                                                };

                                                return (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                                        {/* Moisture */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Droplet size={14} color="#7B5233" />
                                                                    1. Độ ẩm (Moisture)
                                                                </span>
                                                                {getPassBadge(results.moisture?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ ẩm tối thiểu đo được: <b>{results.moisture?.min ? `${results.moisture.min}%` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ ẩm tối đa đo được: <b>{results.moisture?.max ? `${results.moisture.max}%` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Bend */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Activity size={14} color="#7B5233" />
                                                                    2. Độ cong vênh (Bend)
                                                                </span>
                                                                {getPassBadge(results.bend?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong tối thiểu: <b>{results.bend?.min ? `${results.bend.min} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong tối đa: <b>{results.bend?.max ? `${results.bend.max} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Size */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Maximize2 size={14} color="#7B5233" />
                                                                    3. Kích thước (Size check)
                                                                </span>
                                                                {getPassBadge(results.size?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Chiều Dài: <b>{results.size?.long ? `${results.size.long} mm` : '---'}</b> | Chiều Rộng: <b>{results.size?.wide ? `${results.size.wide} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Chiều Dày: <b>{results.size?.thick ? `${results.size.thick} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Structure */}
                                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6F0', paddingBottom: '6px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <Layers size={14} color="#7B5233" />
                                                                    4. Kết cấu sản phẩm
                                                                </span>
                                                                {getPassBadge(results.structure?.is_pass)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Độ cong góc: <b>{results.structure?.bend ? `${results.structure.bend} mm` : '---'}</b>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#424242' }}>
                                                                Mặt Rộng: <b>{results.structure?.wide ? `${results.structure.wide} mm` : '---'}</b> | Mặt Cao: <b>{results.structure?.high ? `${results.structure.high} mm` : '---'}</b>
                                                            </div>
                                                        </div>

                                                        {/* Visual & Others */}
                                                        {[
                                                            { label: '5. Bám dính sơn (Visual)', isPass: results.visual?.is_pass },
                                                            { label: '6. Bộ phụ kiện đi kèm (Accessories)', isPass: results.accessories?.is_pass },
                                                            { label: '7. Ngoại quan bề mặt (Visual Ext)', isPass: results.visual_ext?.is_pass },
                                                            { label: '8. Tính năng sản phẩm (Functional)', isPass: results.functional?.is_pass },
                                                        ].map((extraCheck, ecIdx) => (
                                                            <div key={ecIdx} style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <CheckCircle2 size={14} color="#7B5233" />
                                                                    {extraCheck.label}
                                                                </span>
                                                                {getPassBadge(extraCheck.isPass)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* 3. QC Evidence Images */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                ẢNH MINH CHỨNG KIỂM ĐỊNH (QC)
                                            </h4>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '12px', 
                                                flexWrap: 'wrap', 
                                                background: 'white', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                border: '1px solid #EADCC9' 
                                            }}>
                                                {!qcDetail.images || qcDetail.images.length === 0 ? (
                                                    <span style={{ fontSize: '13px', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh lỗi / kiểm QC nào được đính kèm.</span>
                                                ) : (
                                                    qcDetail.images.map((img, imgIdx) => {
                                                        const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                        return (
                                                            <div 
                                                                key={imgIdx} 
                                                                onClick={() => setActiveImage(url)}
                                                                style={{ 
                                                                    width: '120px', 
                                                                    height: '90px', 
                                                                    borderRadius: '8px', 
                                                                    overflow: 'hidden', 
                                                                    border: '1px solid #EADCC9', 
                                                                    cursor: 'zoom-in',
                                                                    position: 'relative',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            >
                                                                <img src={url} alt={img.description || 'QC Proof'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(198,40,40,0.85)', color: 'white', fontSize: '9px', textAlign: 'center', padding: '2px 0', fontWeight: '700' }}>
                                                                    {getCategoryLabel(img.description)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {/* Tab QC inspection results (Đầu vào) */}
                                    {!inputQcDetail ? (
                                        <div style={{ 
                                            background: '#FAF6F0', 
                                            border: '2px dashed #EADCC9', 
                                            borderRadius: '16px', 
                                            padding: '40px', 
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '15px'
                                        }}>
                                            <AlertCircle size={48} color="#D97706" />
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#5D4037' }}>
                                                Chưa có thông tin kiểm định đầu vào
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#8D6E63', maxWidth: '450px', lineHeight: '1.5' }}>
                                                Chi tiết này chưa thực hiện kiểm tra kích thước đầu vào (MB2.4) trước khi giao hàng.
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* 1. Inbound QC General Info */}
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '16px', 
                                                marginBottom: '24px',
                                                background: 'white',
                                                padding: '20px',
                                                borderRadius: '16px',
                                                border: '1px solid #EADCC9'
                                            }}>
                                                {[
                                                    { label: 'Người kiểm định QC', value: inputQcDetail.inspector_name || 'N/A', icon: <User size={16} color="#8D6E63" /> },
                                                    { label: 'Thời gian kiểm định', value: inputQcDetail.inspected_at ? new Date(inputQcDetail.inspected_at).toLocaleString('vi-VN') : '---', icon: <Calendar size={16} color="#8D6E63" /> },
                                                    { label: 'Công đoạn kiểm', value: inputQcDetail.stage || '---', icon: <Layers size={16} color="#8D6E63" /> },
                                                    { label: 'Mã Cont', value: inputQcDetail.cont_name || '---', icon: <MapPin size={16} color="#8D6E63" /> },
                                                    { label: 'Quy cách kỹ thuật', value: inputQcDetail.specification || '---', icon: <Info size={16} color="#8D6E63" /> },
                                                    { 
                                                        label: 'KẾT LUẬN QC ĐẦU VÀO', 
                                                        value: inputQcDetail.result || 'CHƯA RÕ', 
                                                        color: inputQcDetail.result === 'Đạt' ? '#2E7D32' : '#C62828',
                                                        icon: <Activity size={16} color="#8D6E63" /> 
                                                    },
                                                ].map((item, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                        <div style={{ marginTop: '3px' }}>{item.icon}</div>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                                                            <div style={{ fontSize: '13px', color: item.color || '#2D1A12', fontWeight: '800', marginTop: '2px' }}>{item.value}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid #FAF6F0', paddingTop: '10px' }}>
                                                    <div style={{ marginTop: '2px' }}><Info size={16} color="#8D6E63" /></div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', color: '#8D6E63', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú kiểm định QC</div>
                                                        <div style={{ fontSize: '13px', color: '#5D4037', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                                                            {inputQcDetail.note || 'Không có ghi chú kiểm định chất lượng.'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
 
                                            {/* 2. Measured Dimensions check */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                KÍCH THƯỚC ĐO ĐẠC ĐẦU VÀO
                                            </h4>
                                            
                                            {(() => {
                                                let length = inputQcDetail.measured_length;
                                                let width = inputQcDetail.measured_width;
                                                let height = inputQcDetail.measured_height;
                                                
                                                if ((!length && !width && !height) && inputQcDetail.specification) {
                                                    const parts = inputQcDetail.specification.split(/[*x]/).map(p => p.trim());
                                                    if (parts.length === 3) {
                                                        height = parts[0];
                                                        width = parts[1];
                                                        length = parts[2];
                                                    }
                                                }
                                                
                                                return (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                                        {[
                                                            { label: 'Chiều Dài', value: length ? `${length} mm` : '---' },
                                                            { label: 'Chiều Rộng', value: width ? `${width} mm` : '---' },
                                                            { label: 'Chiều Dầy (Cao)', value: height ? `${height} mm` : '---' }
                                                        ].map((dim, dimIdx) => (
                                                            <div key={dimIdx} style={{ background: 'white', borderRadius: '12px', border: '1px solid #EADCC9', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#5D4037' }}>
                                                                    {dim.label}
                                                                </div>
                                                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#7B5233' }}>
                                                                    {dim.value}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* 3. Proof Images */}
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#5D4037', borderLeft: '4px solid #7B5233', paddingLeft: '8px' }}>
                                                ẢNH MINH CHỨNG KIỂM ĐẦU VÀO
                                            </h4>
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '12px', 
                                                flexWrap: 'wrap', 
                                                background: 'white', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                border: '1px solid #EADCC9' 
                                            }}>
                                                {[inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3].filter(Boolean).length === 0 ? (
                                                    <span style={{ fontSize: '13px', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh kiểm định nào được đính kèm.</span>
                                                ) : (
                                                    [inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3].filter(Boolean).map((imgUrl, imgIdx) => {
                                                        const url = `${API_ROOT}${imgUrl.replace(/^\//, '')}`;
                                                        return (
                                                            <div 
                                                                key={imgIdx} 
                                                                onClick={() => setActiveImage(url)}
                                                                style={{ 
                                                                    width: '120px', 
                                                                    height: '90px', 
                                                                    borderRadius: '8px', 
                                                                    overflow: 'hidden', 
                                                                    border: '1px solid #EADCC9', 
                                                                    cursor: 'zoom-in',
                                                                    position: 'relative',
                                                                    transition: 'transform 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            >
                                                                <img src={url} alt={`QC Input Proof ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{ 
                            padding: '12px 24px', 
                            borderTop: '1px solid #EADCC9', 
                            background: '#FAF6F0', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={handlePrintPDF}
                                    style={{ 
                                        padding: '8px 18px', 
                                        background: 'white', 
                                        color: '#7B5233', 
                                        border: '1px solid #EADCC9', 
                                        borderRadius: '8px', 
                                        fontSize: '13px', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#FAF6F0';
                                        e.currentTarget.style.borderColor = '#7B5233';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.borderColor = '#EADCC9';
                                    }}
                                >
                                    <FileText size={16} color="#7B5233" />
                                    Xuất PDF
                                </button>
                                <button 
                                    onClick={handleExportDetailExcel}
                                    style={{ 
                                        padding: '8px 18px', 
                                        background: 'white', 
                                        color: '#2E7D32', 
                                        border: '1px solid #C8E6C9', 
                                        borderRadius: '8px', 
                                        fontSize: '13px', 
                                        fontWeight: '700', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#E8F5E9';
                                        e.currentTarget.style.borderColor = '#2E7D32';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.borderColor = '#C8E6C9';
                                    }}
                                >
                                    <FileSpreadsheet size={16} color="#2E7D32" />
                                    Xuất Excel
                                </button>
                            </div>
                            <button 
                                onClick={handleCloseDetailModal}
                                style={{ 
                                    padding: '8px 18px', 
                                    background: '#7B5233', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D4037'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                            >
                                Đóng lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Sheet Modal */}
            {isDetailModalOpen && (
                <div className="bottom-sheet-backdrop mobile-only" onClick={handleCloseDetailModal}>
                    <div className="bottom-sheet-container bottom-sheet-full" onClick={e => e.stopPropagation()} style={{ padding: '20px 16px' }}>
                        <div className="bottom-sheet-handle"></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f5f5f5', fontSize: '0.75rem', fontWeight: '800', color: '#5D4037' }}>
                                    BG-{selectedDelivery?.id}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#5D4037' }}>
                                    {selectedDelivery?.part_name || 'Chi tiết bàn giao'}
                                </h3>
                            </div>
                            <button onClick={handleCloseDetailModal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
                        </div>

                        {/* Tabs bar */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', marginBottom: '16px' }}>
                            <button 
                                onClick={() => setModalTab('handover')}
                                style={{ 
                                    flex: 1, padding: '12px 6px', background: 'none', border: 'none', 
                                    borderBottom: modalTab === 'handover' ? '2px solid #7B5233' : '2px solid transparent', 
                                    color: modalTab === 'handover' ? '#7B5233' : '#757575', fontWeight: '700', fontSize: '0.8rem',
                                    textAlign: 'center'
                                }}
                            >
                                Bàn Giao & PO
                            </button>
                            <button 
                                onClick={() => setModalTab('qc_end')}
                                style={{ 
                                    flex: 1, padding: '12px 6px', background: 'none', border: 'none', 
                                    borderBottom: modalTab === 'qc_end' ? '2px solid #7B5233' : '2px solid transparent', 
                                    color: modalTab === 'qc_end' ? '#7B5233' : '#757575', fontWeight: '700', fontSize: '0.8rem',
                                    textAlign: 'center'
                                }}
                            >
                                QC (Đầu Cuối)
                            </button>
                            <button 
                                onClick={() => setModalTab('qc_start')}
                                style={{ 
                                    flex: 1, padding: '12px 6px', background: 'none', border: 'none', 
                                    borderBottom: modalTab === 'qc_start' ? '2px solid #7B5233' : '2px solid transparent', 
                                    color: modalTab === 'qc_start' ? '#7B5233' : '#757575', fontWeight: '700', fontSize: '0.8rem',
                                    textAlign: 'center'
                                }}
                            >
                                QC (Đầu Vào)
                            </button>
                        </div>

                        {modalLoading ? (
                            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                                <div style={{ fontSize: '0.8rem', color: '#8D6E63' }}>Đang tải...</div>
                            </div>
                        ) : modalTab === 'handover' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* General info */}
                                <div style={{ background: '#FAF8F6', padding: '12px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                    {[
                                        ['Người giao', deliveryDetail?.sx_delivery_name || 'N/A'],
                                        ['Người nhận', deliveryDetail?.sx_receipt_name || '---'],
                                        ['Thời gian', deliveryDetail?.created_at ? new Date(deliveryDetail.created_at).toLocaleString('vi-VN') : '---'],
                                        ['Chặng giao', `${deliveryDetail?.delivery_stage || '---'} ➔ ${deliveryDetail?.receiving_stage || '---'}`],
                                        ['Ghi chú', deliveryDetail?.note || 'Không có ghi chú']
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fcfcfc', fontSize: '0.8rem' }}>
                                            <span style={{ color: '#8D6E63' }}>{k}</span>
                                            <span style={{ fontWeight: '700', color: '#2D1A12' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Quantities */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {[
                                        ['GIAO', deliveryDetail?.quantity_total, '#7B5233', '#FAF6F0'],
                                        ['NHẬN', deliveryDetail?.quantity_received, '#2E7D32', '#E8F5E9'],
                                        ['TRẢ', deliveryDetail?.quantity_returned, '#C62828', '#FFEBEE']
                                    ].map(([lbl, val, col, bg]) => (
                                        <div key={lbl} style={{ background: bg, padding: '8px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${col}20` }}>
                                            <div style={{ fontSize: '0.65rem', color: '#757575', fontWeight: '800' }}>{lbl}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: col, marginTop: '2px' }}>{val !== null ? val : '---'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* PO Allocations */}
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>PHÂN BỔ ĐƠN HÀNG</div>
                                    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden' }}>
                                        {!deliveryDetail?.details || deliveryDetail.details.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#8D6E63', fontStyle: 'italic' }}>Không có phân bổ PO.</div>
                                        ) : (
                                            deliveryDetail.details.map((detail, dIdx) => (
                                                <div key={dIdx} style={{ padding: '8px 12px', borderBottom: '1px solid #FAF6F0', fontSize: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                                                        <span style={{ color: '#7B5233' }}>PO: {detail.partner_po || '---'}</span>
                                                        <span style={{ color: '#2D1A12' }}>SL: {detail.quantity}</span>
                                                    </div>
                                                    <div style={{ color: '#666', marginTop: '2px' }}>Đơn: {detail.order_code || '---'} | KH: {detail.customer || '---'}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Evidence Images */}
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>ẢNH MINH CHỨNG GIAO</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {!deliveryDetail?.images || deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).length === 0 ? (
                                            <span style={{ fontSize: '0.75rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có ảnh.</span>
                                        ) : (
                                            deliveryDetail.images.filter(img => !img.description?.startsWith('qc_')).map((img, imgIdx) => {
                                                const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                return (
                                                    <img key={imgIdx} src={url} alt="Proof" onClick={() => setActiveImage(url)} style={{ width: '70px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #EADCC9', cursor: 'zoom-in' }} />
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : modalTab === 'qc_end' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* QC Tab content */}
                                {!qcDetail || !qcDetail.qc_info ? (
                                    <div style={{ padding: '24px 12px', textAlign: 'center', background: '#FAF6F0', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '700' }}>Chưa có thông tin kiểm định QC</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ background: '#FAF8F6', padding: '12px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                            {[
                                                ['QC kiểm tra', deliveryDetail?.qc_receipt_name || 'N/A'],
                                                ['Thời gian QC', qcDetail.qc_info.created_at ? new Date(qcDetail.qc_info.created_at).toLocaleString('vi-VN') : '---'],
                                                ['Kết luận', (deliveryDetail?.quantity_returned > 0 || deliveryDetail?.status === 'Lỗi') ? 'KHÔNG ĐẠT / TRẢ HÀNG' : 'ĐẠT CHẤT LƯỢNG']
                                            ].map(([k, v]) => (
                                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fcfcfc', fontSize: '0.8rem' }}>
                                                    <span style={{ color: '#8D6E63' }}>{k}</span>
                                                    <span style={{ fontWeight: '700', color: (k === 'Kết luận' && v.includes('KHÔNG')) ? '#C62828' : '#2E7D32' }}>{v}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Specs detailed list */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>THÔNG SỐ QC ĐO ĐẠC</div>
                                            {(() => {
                                                let results = {};
                                                try {
                                                    results = typeof qcDetail.qc_info.results_json === 'string' 
                                                        ? JSON.parse(qcDetail.qc_info.results_json) 
                                                        : (qcDetail.qc_info.results_json || {});
                                                } catch (e) {}

                                                const getPassText = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return 'CHƯA KIỂM';
                                                    return isPass ? 'ĐẠT' : 'HỎNG/LỖI';
                                                };

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {[
                                                            ['1. Độ ẩm', results.moisture?.is_pass, `Min: ${results.moisture?.min || '---'}% | Max: ${results.moisture?.max || '---'}%`],
                                                            ['2. Độ cong vênh', results.bend?.is_pass, `Min: ${results.bend?.min || '---'}mm | Max: ${results.bend?.max || '---'}mm`],
                                                            ['3. Kích thước', results.size?.is_pass, `L: ${results.size?.long || '---'} | W: ${results.size?.wide || '---'} | T: ${results.size?.thick || '---'}`],
                                                            ['4. Kết cấu sản phẩm', results.structure?.is_pass, `Cong góc: ${results.structure?.bend || '---'} | Cao: ${results.structure?.high || '---'}`]
                                                        ].map(([lbl, pass, val]) => (
                                                            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '0.75rem' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '700', color: '#5D4037' }}>{lbl}</div>
                                                                    <div style={{ color: '#666', marginTop: '2px' }}>{val}</div>
                                                                </div>
                                                                <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800', background: pass ? '#E8F5E9' : '#FFEBEE', color: pass ? '#2E7D32' : '#C62828' }}>
                                                                    {getPassText(pass)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* QC images */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>ẢNH KIỂM QC</div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {!qcDetail.images || qcDetail.images.length === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có ảnh QC.</span>
                                                ) : (
                                                    qcDetail.images.map((img, imgIdx) => {
                                                        const url = `${API_ROOT}${img.image_path.replace(/^\//, '')}`;
                                                        return (
                                                            <img key={imgIdx} src={url} alt="QC" onClick={() => setActiveImage(url)} style={{ width: '70px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #EADCC9', cursor: 'zoom-in' }} />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* QC Tab content (Đầu vào) */}
                                {!inputQcDetail ? (
                                    <div style={{ padding: '24px 12px', textAlign: 'center', background: '#FAF6F0', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '700' }}>Chưa có thông tin kiểm định đầu vào</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ background: '#FAF8F6', padding: '12px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                            {[
                                                ['Thời gian QC', inputQcDetail.inspected_at ? new Date(inputQcDetail.inspected_at).toLocaleString('vi-VN') : '---'],
                                                ['Công đoạn kiểm', inputQcDetail.stage || '---'],
                                                ['Mã Cont', inputQcDetail.cont_name || '---'],
                                                ['Kết luận', inputQcDetail.result || 'CHƯA RÕ']
                                            ].map(([k, v]) => (
                                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #fcfcfc', fontSize: '0.8rem' }}>
                                                    <span style={{ color: '#8D6E63' }}>{k}</span>
                                                    <span style={{ fontWeight: '700', color: (k === 'Kết luận' && v === 'Không đạt') ? '#C62828' : '#2E7D32' }}>{v}</span>
                                                </div>
                                            ))}
                                            <div style={{ borderTop: '1px solid #FAF6F0', paddingTop: '8px', marginTop: '8px', fontSize: '0.8rem', color: '#5D4037', fontStyle: 'italic' }}>
                                                Ghi chú: {inputQcDetail.note || 'Không có ghi chú.'}
                                            </div>
                                        </div>

                                        {/* Specs detailed list */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>THÔNG SỐ ĐO ĐẠC ĐẦU VÀO</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {[
                                                    ['Chiều Dài', inputQcDetail.measured_length ? `${inputQcDetail.measured_length} mm` : '---'],
                                                    ['Chiều Rộng', inputQcDetail.measured_width ? `${inputQcDetail.measured_width} mm` : '---'],
                                                    ['Chiều Dầy (Cao)', inputQcDetail.measured_height ? `${inputQcDetail.measured_height} mm` : '---']
                                                ].map(([lbl, val]) => (
                                                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '0.75rem' }}>
                                                        <div style={{ fontWeight: '700', color: '#5D4037' }}>{lbl}</div>
                                                        <span style={{ fontWeight: '800', color: '#7B5233' }}>
                                                            {val}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* QC images */}
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>ẢNH MINH CHỨNG ĐẦU VÀO</div>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {[inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3].filter(Boolean).length === 0 ? (
                                                    <span style={{ fontSize: '0.75rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có ảnh đầu vào.</span>
                                                ) : (
                                                    [inputQcDetail.image_path_1, inputQcDetail.image_path_2, inputQcDetail.image_path_3].filter(Boolean).map((imgUrl, imgIdx) => {
                                                        const url = `${API_ROOT}${imgUrl.replace(/^\//, '')}`;
                                                        return (
                                                            <img key={imgIdx} src={url} alt="QC Input" onClick={() => setActiveImage(url)} style={{ width: '70px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #EADCC9', cursor: 'zoom-in' }} />
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    className="btn" 
                                    onClick={handlePrintPDF} 
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        background: 'white', 
                                        color: '#7B5233', 
                                        border: '1px solid #EADCC9', 
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FileText size={16} /> Xuất PDF
                                </button>
                                <button 
                                    className="btn" 
                                    onClick={handleExportDetailExcel} 
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        background: 'white', 
                                        color: '#2E7D32', 
                                        border: '1px solid #C8E6C9', 
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FileSpreadsheet size={16} /> Excel
                                </button>
                            </div>
                            <button className="btn btn-primary" onClick={handleCloseDetailModal} style={{ width: '100%', padding: '12px' }}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Image Popup */}
            {activeImage && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20000,
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setActiveImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <img src={activeImage} alt="Enlarged Proof" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                        <button 
                            onClick={() => setActiveImage(null)}
                            style={{ 
                                position: 'absolute', 
                                top: '-40px', 
                                right: '0px', 
                                background: 'white', 
                                border: 'none', 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={18} color="#000" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryTracking;
