import ExcelJS from 'exceljs';
import { API_ROOT } from '@webShared/Services/api.service';

export const handleExportExcel = async (filteredDeliveries) => {
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

export const handleExportDetailExcel = async (selectedDelivery, deliveryDetail, inputQcDetail, qcDetail) => {
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
                const fetchUrl = imageUrl.includes('image-proxy') 
                    ? (imageUrl.includes('as_base64=true') ? imageUrl : `${imageUrl}&as_base64=true`)
                    : imageUrl;
                
                const response = await fetch(fetchUrl);
                if (!response.ok) return null;

                if (fetchUrl.includes('as_base64=true')) {
                    try {
                        const data = await response.json();
                        if (data && data.base64) return data.base64;
                    } catch (e) {
                        // Fallback to blob if JSON parsing fails
                    }
                }
                
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result;
                        if (res && typeof res === 'string') {
                            const base64Data = res.split(',')[1] || null;
                            resolve(base64Data);
                        } else {
                            resolve(null);
                        }
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error("Lỗi khi fetch image as base64:", error);
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
        const fitImage = (naturalWidth, naturalHeight, maxWidth = 310, maxHeight = 160) => {
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
            const rowHeightPx = 150 * 1.33; // ~200px

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
                                fittedSizes.push(fitImage(dims.width, dims.height, 310, 150));
                            } else {
                                fittedSizes.push({ width: 310, height: 150 });
                            }
                        }

                        // Add image row
                        const imgRow = wsSheet.addRow([]);
                        const imgR = imgRow.number;
                        imgRow.height = 150;

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
                            const size = fitImage(dims.width, dims.height, 310, 150);
                            fittedSizes.push(size);
                        } else {
                            fittedSizes.push({ width: 310, height: 150 });
                        }
                    }

                    const imgRow = wsSheet.addRow([]);
                    const imgR = imgRow.number;
                    imgRow.height = 150; // Height for image

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
