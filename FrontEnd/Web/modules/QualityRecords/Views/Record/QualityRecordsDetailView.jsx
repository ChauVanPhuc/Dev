import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
    ChevronLeft, 
    FileText, 
    Truck, 
    ClipboardCheck, 
    ShieldCheck,
    Calendar, 
    User, 
    Package, 
    ArrowRight, 
    MapPin, 
    AlertCircle, 
    CheckCircle2, 
    Eye, 
    Clock, 
    FileDown, 
    X, 
    Layers, 
    Folder, 
    Tag, 
    Sliders, 
    Building2, 
    FileCheck, 
    Info, 
    Search, 
    Filter,
    BarChart2,
    LayoutDashboard,
    TrendingUp,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Percent,
    ChevronRight,
    Grid,
    List,
    Maximize2,
    ExternalLink,
    FileSpreadsheet,
    Printer,
    Camera,
    History,
    Edit
} from 'lucide-react';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import ExcelJS from 'exceljs';

const QualityRecordsDetailView = () => {
    const { id } = useParams(); // poCode
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
    // Lấy metadata từ database
    const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records/:id');
    
    // 2 TABS SETUP: 'products' (Mặc định - gom 5 phần) & 'others' (Dashboard tổng hợp)
    const [activeTab, setActiveTab] = useState('products');
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [orderInfo, setOrderInfo] = useState(null);
    const [handoverData, setHandoverData] = useState([]);
    const [allInspectionsData, setAllInspectionsData] = useState([]);
    const [bomData, setBomData] = useState([]);
    
    // Tab 1 Filter & View States
    const [productViewMode, setProductViewMode] = useState('table'); // 'table' | 'cards'
    const [productSearch, setProductSearch] = useState('');
    const [productFilter, setProductFilter] = useState('all'); // 'all' | 'delivered' | 'qc' | 'error'

    // Drill-down Modal State (BOM, Handovers, Inspections, Defects of a product)
    const [drillModal, setDrillModal] = useState({
        isOpen: false,
        type: null, // 'bom' | 'handovers' | 'inspections' | 'defects'
        product: null
    });
    const [drillSearch, setDrillSearch] = useState('');
    const [drillStageFilter, setDrillStageFilter] = useState('all');

    // Individual Handover Detail Modal
    const [selectedHandoverItem, setSelectedHandoverItem] = useState(null);
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

    // RICH INSPECTION DETAIL MODAL (KHỚP HOÀN TOÀN ẢNH 2)
    const [inspectionModalData, setInspectionModalData] = useState({
        isOpen: false,
        item: null,
        list: [],
        currentIndex: 0,
        modalTab: 'info' // 'info' | 'details'
    });

    // Lightbox Image Zoom / Pan States
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    // State cho xuất file Excel
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedExportOption, setSelectedExportOption] = useState('all_tabs');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (screenCode && title) {
            if (setCustomTitle) setCustomTitle(title);
            if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
            if (setCustomScreenCode) setCustomScreenCode(screenCode);
        }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // Keyboard navigation cho Rich Inspection Detail Modal (Tab, Left/Right arrows, Esc)
    useEffect(() => {
        if (!inspectionModalData.isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setInspectionModalData(prev => ({ ...prev, isOpen: false }));
            } else if (e.key === 'Tab') {
                e.preventDefault();
                setInspectionModalData(prev => ({
                    ...prev,
                    modalTab: prev.modalTab === 'info' ? 'details' : (prev.modalTab === 'details' ? 'history' : 'info')
                }));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setInspectionModalData(prev => {
                    if (prev.currentIndex > 0) {
                        const nextIdx = prev.currentIndex - 1;
                        return {
                            ...prev,
                            currentIndex: nextIdx,
                            item: prev.list[nextIdx]
                        };
                    }
                    return prev;
                });
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setInspectionModalData(prev => {
                    if (prev.currentIndex < prev.list.length - 1) {
                        const nextIdx = prev.currentIndex + 1;
                        return {
                            ...prev,
                            currentIndex: nextIdx,
                            item: prev.list[nextIdx]
                        };
                    }
                    return prev;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inspectionModalData.isOpen]);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [order, handover, allInspections, bom] = await Promise.all([
                    qualityService.getOrderDetail(id).catch(() => null),
                    qualityService.getHandoverHistory(id).catch(() => []),
                    qualityService.getAllPOInspections(id).catch(() => []),
                    qualityService.getPOBOM(id).catch(() => [])
                ]);

                setOrderInfo(order);
                setHandoverData(handover || []);
                setAllInspectionsData(allInspections || []);
                setBomData(bom || []);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu chi tiết hồ sơ:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [id]);

    // Helper functions
    const formatDate = (dateStr) => {
        if (!dateStr) return "---";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "---";
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return "---";
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    const formatDisplayDateTime = (dateStr) => {
        if (!dateStr) return "---";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${hours}:${mins} ${day}/${month}/${year}`;
        } catch {
            return String(dateStr);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
            case 'Pass':
            case 'Đạt':
                return { bg: '#E8F5E9', color: '#2E7D32' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
            case 'Chờ':
                return { bg: '#FFF3E0', color: '#E65100' };
            case 'Lỗi':
            case 'Từ chối':
            case 'Fail':
            case 'Không đạt':
                return { bg: '#FFEBEE', color: '#C62828' };
            default:
                return { bg: '#F5F5F5', color: '#757575' };
        }
    };

    // --- CORRELATION & AGGREGATION LOGIC (GOM 5 PHẦN VÀO TỪNG SẢN PHẨM) ---
    const productsWithData = useMemo(() => {
        let baseProducts = [];
        if (orderInfo?.products && orderInfo.products.length > 0) {
            baseProducts = orderInfo.products;
        } else if (bomData && bomData.length > 0) {
            const map = new Map();
            bomData.forEach(b => {
                const key = (b.product_sku || b.product_name || 'SP_CHUNG').trim();
                if (!map.has(key)) {
                    map.set(key, {
                        sku: b.product_sku || '---',
                        name: b.product_name || 'Sản phẩm đơn hàng',
                        specification: '---',
                        unit: 'Chiếc',
                        order_qty: 0,
                        production_qty: 0,
                        loss_qty: 0,
                        status: 'Active'
                    });
                }
            });
            baseProducts = Array.from(map.values());
        }

        const isSingleProductOrder = baseProducts.length === 1;

        return baseProducts.map((p, pIndex) => {
            const pSku = (p.sku || '').trim().toLowerCase();
            const pName = (p.name || '').trim().toLowerCase();

            const pBoms = bomData.filter(b => {
                if (isSingleProductOrder) return true;
                const bProdSku = (b.product_sku || '').trim().toLowerCase();
                const bProdName = (b.product_name || '').trim().toLowerCase();
                if (pSku && bProdSku && (bProdSku === pSku || bProdSku.includes(pSku) || pSku.includes(bProdSku))) return true;
                if (pName && bProdName && (bProdName === pName || bProdName.includes(pName) || pName.includes(bProdName))) return true;
                return false;
            });

            const keywords = new Set();
            if (pSku && pSku.length >= 2) keywords.add(pSku);
            if (pName && pName.length >= 2) keywords.add(pName);
            pBoms.forEach(b => {
                const bSku = (b.sku || '').trim().toLowerCase();
                const bName = (b.name || b.part_name || '').trim().toLowerCase();
                if (bSku && bSku !== 'n/a' && bSku.length >= 2) keywords.add(bSku);
                if (bName && bName.length >= 3) keywords.add(bName);
            });

            if (p.bom_details && Array.isArray(p.bom_details)) {
                p.bom_details.forEach(b => {
                    const bSku = (b.sku || '').trim().toLowerCase();
                    const bName = (b.name || '').trim().toLowerCase();
                    if (bSku && bSku.length >= 2) keywords.add(bSku);
                    if (bName && bName.length >= 3) keywords.add(bName);
                });
            }

            const matchesKeywords = (text) => {
                if (isSingleProductOrder) return true;
                if (!text) return false;
                const low = text.toLowerCase();
                for (const kw of keywords) {
                    if (low.includes(kw)) return true;
                }
                return false;
            };

            const pHandovers = handoverData.filter(h => {
                if (isSingleProductOrder) return true;
                return matchesKeywords(h.part_name) || matchesKeywords(h.product_name) || matchesKeywords(h.note);
            });

            const pInspections = allInspectionsData.filter(ins => {
                if (isSingleProductOrder) return true;
                if (matchesKeywords(ins.part_name)) return true;
                if (ins.parts_list && ins.parts_list.some(part => matchesKeywords(part))) return true;
                if (ins.data_json) {
                    const dj = ins.data_json;
                    if (matchesKeywords(dj.product) || matchesKeywords(dj.part_name) || matchesKeywords(dj.batch_no)) return true;
                }
                return false;
            });

            const pDefects = pInspections.filter(ins => !ins.is_pass || (ins.error_qty && ins.error_qty > 0));

            const orderQty = p.order_qty || p.quantity || 0;
            const productionQty = p.production_qty || orderQty;
            const lossQty = p.loss_qty || 0;

            const handoverCount = pHandovers.length;
            const handoverQty = pHandovers.reduce((acc, cur) => acc + (cur.quantity_total || 0), 0);
            const deliveryRate = orderQty > 0 ? Math.min(100, Math.round((handoverQty / orderQty) * 100)) : (handoverCount > 0 ? 100 : 0);

            const inspectionCount = pInspections.length;
            const passCount = pInspections.filter(ins => ins.is_pass).length;
            const failCount = pInspections.filter(ins => !ins.is_pass).length;
            const defectCount = pInspections.reduce((acc, cur) => acc + (cur.error_qty || 0), 0);
            const passRate = inspectionCount > 0 ? Math.round((passCount / inspectionCount) * 100) : 100;

            return {
                ...p,
                index: pIndex + 1,
                orderQty,
                productionQty,
                lossQty,
                boms: pBoms,
                bomCount: pBoms.length,
                handovers: pHandovers,
                handoverCount,
                handoverQty,
                deliveryRate,
                inspections: pInspections,
                inspectionCount,
                passCount,
                failCount,
                defectCount,
                passRate,
                defects: pDefects
            };
        });
    }, [orderInfo, handoverData, allInspectionsData, bomData]);

    // Lọc danh sách sản phẩm
    const filteredProducts = useMemo(() => {
        return productsWithData.filter(p => {
            const q = productSearch.toLowerCase().trim();
            const matchSearch = !q || (p.name && p.name.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q));
            if (!matchSearch) return false;

            if (productFilter === 'delivered') return p.handoverCount > 0;
            if (productFilter === 'qc') return p.inspectionCount > 0;
            if (productFilter === 'error') return p.defectCount > 0 || p.failCount > 0;
            return true;
        });
    }, [productsWithData, productSearch, productFilter]);

    // Dashboard metrics
    const dashboardMetrics = useMemo(() => {
        const totalProducts = productsWithData.length;
        const totalOrderQty = productsWithData.reduce((acc, p) => acc + p.orderQty, 0);
        const totalProductionQty = productsWithData.reduce((acc, p) => acc + p.productionQty, 0);
        const totalDeliveredQty = handoverData.reduce((acc, h) => acc + (h.quantity_total || 0), 0);
        const totalHandovers = handoverData.length;

        const totalInspections = allInspectionsData.length;
        const totalPassInspections = allInspectionsData.filter(i => i.is_pass).length;
        const totalFailInspections = allInspectionsData.filter(i => !i.is_pass).length;
        const overallPassRate = totalInspections > 0 ? Math.round((totalPassInspections / totalInspections) * 100) : 100;
        const totalDefects = allInspectionsData.reduce((acc, i) => acc + (i.error_qty || 0), 0);

        const typeBreakdown = {
            first_sample: allInspectionsData.filter(i => i.type_label === 'Mẫu đầu tiên').length,
            stage: allInspectionsData.filter(i => i.type_label === 'Công đoạn').length,
            re_inspect: allInspectionsData.filter(i => i.type_label === 'Tái kiểm tra').length,
            spec: allInspectionsData.filter(i => i.type_label === 'Thông số kỹ thuật').length
        };

        const stagesMap = new Map();
        allInspectionsData.forEach(i => {
            const stg = i.stage || 'QC';
            if (!stagesMap.has(stg)) {
                stagesMap.set(stg, { stage: stg, count: 0, pass: 0, fail: 0, errors: 0 });
            }
            const s = stagesMap.get(stg);
            s.count += 1;
            if (i.is_pass) s.pass += 1;
            else s.fail += 1;
            s.errors += (i.error_qty || 0);
        });
        const stagesList = Array.from(stagesMap.values());

        const inspectorSet = new Set();
        allInspectionsData.forEach(i => {
            if (i.inspector_name && i.inspector_name !== '---') inspectorSet.add(i.inspector_name);
        });

        return {
            totalProducts,
            totalOrderQty,
            totalProductionQty,
            totalDeliveredQty,
            totalHandovers,
            totalInspections,
            totalPassInspections,
            totalFailInspections,
            overallPassRate,
            totalDefects,
            typeBreakdown,
            stagesList,
            inspectors: Array.from(inspectorSet)
        };
    }, [productsWithData, handoverData, allInspectionsData]);

    const tabs = [
        { id: 'products', label: `Sản phẩm PO (${productsWithData.length})`, icon: <Package size={18} /> },
        { id: 'others', label: 'Khác (Dashboard tổng hợp)', icon: <BarChart2 size={18} /> }
    ];

    // Mở Drill-down Modal
    const handleOpenDrillModal = (e, type, product) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setDrillModal({
            isOpen: true,
            type,
            product
        });
        setDrillSearch('');
        setDrillStageFilter('all');
    };

    const handleCloseDrillModal = () => {
        setDrillModal({ isOpen: false, type: null, product: null });
    };

    // Mở Phiếu Bàn Giao
    const handleOpenHandoverModal = (e, item) => {
        if (e) {
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedHandoverItem(item);
        setIsHandoverModalOpen(true);
    };

    // MỞ CHI TIẾT PHIẾU KIỂM TRA QC (KHỚP HOÀN TOÀN ẢNH 2)
    const handleOpenInspectionDetail = (e, item, list = [], index = 0) => {
        if (e) {
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
        }
        const targetList = list && list.length > 0 ? list : [item];
        const targetIndex = index >= 0 ? index : targetList.findIndex(x => x.id === item.id);
        setInspectionModalData({
            isOpen: true,
            item,
            list: targetList,
            currentIndex: Math.max(0, targetIndex),
            modalTab: 'info'
        });
    };

    const handleCloseInspectionDetail = () => {
        setInspectionModalData(prev => ({ ...prev, isOpen: false }));
    };

    // Trích xuất danh sách chi tiết / phôi cho Tab 2 (Chi tiết)
    const getReportParts = (item) => {
        if (!item) return [];
        const dj = item.data_json;
        if (dj && Array.isArray(dj.parts) && dj.parts.length > 0) {
            return dj.parts.map((p, idx) => ({
                stt: idx + 1,
                name: p.name || p.part_name || item.part_name || 'Chi tiết',
                spec: p.spec || p.specification || item.specification || 'N/A',
                cabinet: p.sku || p.cabinet || item.product_sku || item.product_name || '---',
                qty: p.qty || p.quantity || item.sample_qty || 1
            }));
        }
        if (item.parts_with_specs && item.parts_with_specs.length > 0) {
            return item.parts_with_specs.map((p, idx) => ({
                stt: idx + 1,
                name: p.name || item.part_name || 'Chi tiết',
                spec: p.spec || item.specification || 'N/A',
                cabinet: item.product_sku || item.product_name || '---',
                qty: item.sample_qty || 1
            }));
        }
        if (item.parts_list && item.parts_list.length > 0) {
            return item.parts_list.map((p, idx) => ({
                stt: idx + 1,
                name: p,
                spec: item.specification || 'N/A',
                cabinet: item.product_sku || item.product_name || '---',
                qty: item.sample_qty || 1
            }));
        }
        return [{
            stt: 1,
            name: item.part_name || 'Chi tiết kiểm tra',
            spec: item.specification || 'N/A',
            cabinet: item.product_sku || item.product_name || '---',
            qty: item.sample_qty || 1
        }];
    };

    // Trích xuất danh sách lỗi cho Tab 2 (Chi tiết)
    const getReportErrors = (item) => {
        if (!item) return [];
        const dj = item.data_json;
        if (dj && Array.isArray(dj.errors) && dj.errors.length > 0) {
            return dj.errors.map((err, idx) => ({
                stt: String(idx + 1).padStart(2, '0'),
                name: err.name || err.error_name || 'Lỗi kiểm tra',
                qty: err.qty || err.quantity || 1,
                note: err.note || err.description || '—'
            }));
        }
        if (item.error_qty && item.error_qty > 0) {
            return [{
                stt: '01',
                name: item.note || 'Lỗi quy cách / chất lượng bề mặt',
                qty: item.error_qty,
                note: item.note ? 'Ghi nhận chi tiết trong biên bản QC' : '—'
            }];
        }
        return [];
    };

    const renderImageGallery = (images) => {
        if (!images || images.length === 0) return null;
        
        const normalizedImages = images.map(img => 
            typeof img === 'string' ? img : img.image_path || img.url
        ).filter(Boolean);

        const displayImages = normalizedImages.slice(0, 4);
        if (displayImages.length === 0) return null;

        return (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                {displayImages.map((path, i) => {
                    const fullUrl = path.startsWith('http') ? path : `${API_ROOT}${path.replace(/^\//, '')}`;
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1.5px solid #EADCC9',
                                backgroundColor: '#FAF6F0',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(fullUrl);
                                setImageZoom(1);
                                setImagePan({ x: 0, y: 0 });
                                setIsDragging(false);
                                setImageModalOpen(true);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Nhấp để xem ảnh lớn"
                        >
                            <img
                                src={fullUrl}
                                alt={`Ảnh ${i + 1}`}
                                style={{ width: '84px', height: '84px', objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: 0, left: 0, right: 0,
                                backgroundColor: 'rgba(45, 26, 18, 0.7)',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                padding: '1px 0'
                            }}>
                                Ảnh {i + 1}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- EXCEL EXPORT LOGIC ---
    const formatExcelHeader = (worksheet, headerTitle, columnsCount) => {
        worksheet.mergeCells(1, 1, 1, columnsCount);
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = headerTitle;
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells(2, 1, 2, columnsCount);
        const subCell = worksheet.getCell(2, 1);
        subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Hệ thống Quản Trị SmartFlow`;
        subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B301E' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF6F0' } };
        worksheet.getRow(2).height = 24;
        worksheet.getRow(3).height = 15;
    };

    const styleTableHeaderRow = (worksheet, rowNumber, columnsCount) => {
        worksheet.views = [{ state: 'frozen', ySplit: rowNumber }];
        const row = worksheet.getRow(rowNumber);
        row.height = 26;
        for (let c = 1; c <= columnsCount; c++) {
            const cell = worksheet.getCell(rowNumber, c);
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B5233' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'EADCC9' } },
                bottom: { style: 'medium', color: { argb: '4B301E' } },
                left: { style: 'thin', color: { argb: 'EADCC9' } },
                right: { style: 'thin', color: { argb: 'EADCC9' } }
            };
        }
    };

    const applyDefaultBorders = (worksheet, startRow, endRow, colsCount) => {
        for (let r = startRow; r <= endRow; r++) {
            const row = worksheet.getRow(r);
            row.height = 20;
            const isEven = r % 2 === 0;
            for (let c = 1; c <= colsCount; c++) {
                const cell = worksheet.getCell(r, c);
                cell.font = { name: 'Arial', size: 10 };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'EADCC9' } },
                    bottom: { style: 'thin', color: { argb: 'EADCC9' } },
                    left: { style: 'thin', color: { argb: 'EADCC9' } },
                    right: { style: 'thin', color: { argb: 'EADCC9' } }
                };
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAF9F6' } };
                }
            }
        }
    };

    const triggerFileDownload = async (workbook, fileName) => {
        const safeFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = safeFileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    };

    // Xuất Excel cho riêng 1 phiếu kiểm tra QC
    const handleExportSingleInspectionExcel = async (item) => {
        if (!item) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Chi Tiết Phiếu QC');
        
        formatExcelHeader(sheet, `PHIẾU KIỂM TRA CHẤT LƯỢNG - #${item.ticket_code || item.id}`, 5);
        
        const isPass = item.is_pass || item.result === 'Đạt' || item.result === 'pass';
        const parts = getReportParts(item);
        const errors = getReportErrors(item);

        const infoRows = [
            ['MÃ LÔ / PO:', item.batch_no || id, '', 'LOẠI KIỂM TRA:', item.type_label || 'Mẫu đầu tiên'],
            ['NGƯỜI KIỂM TRA:', item.inspector_name || 'QC', '', 'NGÀY GHI NHẬN:', formatDisplayDateTime(item.created_at)],
            ['KẾT QUẢ:', isPass ? 'ĐẠT TIÊU CHUẨN' : 'KHÔNG ĐẠT', '', 'HÀNH ĐỘNG:', isPass ? 'Nhập kho' : 'Trả hàng'],
            ['SL CẦN KIỂM (LÔ):', item.sample_qty || 1, '', 'SỐ LỖI PHÁT HIỆN:', item.error_qty || 0],
            ['GHI CHÚ QC:', item.note || '---', '', '', '']
        ];

        infoRows.forEach(r => sheet.addRow(r));
        sheet.addRow([]);

        // Bảng linh kiện
        sheet.addRow(['DANH SÁCH CHI TIẾT / PHÔI KIỂM TRA']);
        sheet.getRow(11).font = { bold: true, color: { argb: '7B5233' } };
        sheet.addRow(['STT', 'Tên Chi Tiết / Phôi', 'Quy Cách Kỹ Thuật', 'Tên Tủ (SKU)', 'SL Kế Hoạch']);
        styleTableHeaderRow(sheet, 12, 5);

        parts.forEach((p, idx) => {
            sheet.addRow([p.stt, p.name, p.spec, p.cabinet, p.qty]);
        });
        applyDefaultBorders(sheet, 13, parts.length + 12, 5);

        if (errors.length > 0) {
            sheet.addRow([]);
            const startErr = parts.length + 14;
            sheet.addRow(['DANH SÁCH LỖI GHI NHẬN']);
            sheet.getRow(startErr).font = { bold: true, color: { argb: 'DC2626' } };
            sheet.addRow(['STT', 'Tên Lỗi Ghi Nhận', 'Số Lượng Lỗi', 'Ghi Chú Chi Tiết', '']);
            styleTableHeaderRow(sheet, startErr + 1, 5);
            errors.forEach((err) => {
                sheet.addRow([err.stt, err.name, err.qty, err.note, '']);
            });
            applyDefaultBorders(sheet, startErr + 2, startErr + 1 + errors.length, 5);
        }

        await triggerFileDownload(workbook, `Phieu_QC_${item.ticket_code || item.id}.xlsx`);
    };

    const handlePrintSingleInspection = () => {
        window.print();
    };

    // Sheet: Danh mục sản phẩm PO (Tổng hợp 5 phần)
    const fillProductsSummarySheet = (sheet, prods) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Mã SKU', key: 'sku', width: 18 },
            { header: 'Tên Sản Phẩm', key: 'name', width: 32 },
            { header: 'Quy Cách', key: 'spec', width: 22 },
            { header: 'Đơn Vị', key: 'unit', width: 10 },
            { header: 'SL Đặt Hàng', key: 'order_qty', width: 15 },
            { header: 'Vào Lệnh SX', key: 'prod_qty', width: 15 },
            { header: 'SL Đã Bàn Giao', key: 'handover_qty', width: 16 },
            { header: 'Số Phiếu Giao', key: 'handover_count', width: 15 },
            { header: 'Tiến Độ Giao (%)', key: 'delivery_rate', width: 16 },
            { header: 'Tổng Phiếu QC', key: 'ins_count', width: 15 },
            { header: 'Phiếu Đạt', key: 'pass_count', width: 12 },
            { header: 'Phiếu K.Đạt', key: 'fail_count', width: 12 },
            { header: 'Tỷ Lệ Đạt (%)', key: 'pass_rate', width: 15 },
            { header: 'Số Lỗi Phát Hiện', key: 'defect_count', width: 16 },
            { header: 'Chi Tiết BOM', key: 'bom_count', width: 14 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `TỔNG HỢP HỒ SƠ SẢN PHẨM PO - #${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        prods.forEach((p, idx) => {
            sheet.addRow({
                stt: idx + 1,
                sku: p.sku || '---',
                name: p.name || '---',
                spec: p.specification || '---',
                unit: p.unit || 'Chiếc',
                order_qty: p.orderQty,
                prod_qty: p.productionQty,
                handover_qty: p.handoverQty,
                handover_count: p.handoverCount,
                delivery_rate: `${p.deliveryRate}%`,
                ins_count: p.inspectionCount,
                pass_count: p.passCount,
                fail_count: p.failCount,
                pass_rate: `${p.passRate}%`,
                defect_count: p.defectCount,
                bom_count: `${p.bomCount} chi tiết`
            });
        });

        applyDefaultBorders(sheet, 5, prods.length + 4, cols.length);
    };

    const fillDashboardSheet = (sheet, metrics) => {
        const cols = [
            { header: 'Hạng Mục', key: 'category', width: 30 },
            { header: 'Chỉ Số / Giá Trị', key: 'value', width: 25 },
            { header: 'Đơn Vị', key: 'unit', width: 15 },
            { header: 'Ghi Chú Đánh Giá', key: 'note', width: 35 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `DASHBOARD TỔNG HỢP CHẤT LƯỢNG PO #${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        const rows = [
            { category: 'Tổng chủng loại sản phẩm', value: metrics.totalProducts, unit: 'loại', note: 'Danh mục sản phẩm trong đơn' },
            { category: 'Tổng số lượng đặt hàng', value: metrics.totalOrderQty, unit: 'chiếc', note: 'Theo lệnh sản xuất' },
            { category: 'Tổng lượt bàn giao luân chuyển', value: metrics.totalHandovers, unit: 'lượt', note: 'Lịch sử bàn giao các công đoạn' },
            { category: 'Tổng sản lượng chi tiết đã giao', value: metrics.totalDeliveredQty, unit: 'chiếc', note: 'Thực nhận tại các công đoạn' },
            { category: 'Tổng phiếu kiểm tra QC', value: metrics.totalInspections, unit: 'phiếu', note: 'Mẫu đầu tiên + Công đoạn' },
            { category: 'Số phiếu kiểm tra Đạt (Pass)', value: metrics.totalPassInspections, unit: 'phiếu', note: 'Đạt tiêu chuẩn chất lượng' },
            { category: 'Số phiếu kiểm tra Không Đạt (Fail)', value: metrics.totalFailInspections, unit: 'phiếu', note: 'Cần khắc phục / Tái kiểm tra' },
            { category: 'Tỷ lệ đạt chuẩn chất lượng PO', value: `${metrics.overallPassRate}%`, unit: '%', note: metrics.overallPassRate >= 95 ? 'Xuất sắc' : 'Cần kiểm soát' },
            { category: 'Tổng số lỗi phát hiện tại xưởng', value: metrics.totalDefects, unit: 'lỗi', note: 'Ghi nhận từ các biên bản QC' }
        ];

        rows.forEach(r => sheet.addRow(r));
        applyDefaultBorders(sheet, 5, rows.length + 4, cols.length);
    };

    const fillHandoverSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Thời Gian Bàn Giao', key: 'time', width: 20 },
            { header: 'Linh Kiện / Sản Phẩm', key: 'part', width: 25 },
            { header: 'Công Đoạn Giao', key: 'stage_from', width: 20 },
            { header: 'Công Đoạn Nhận', key: 'stage_to', width: 20 },
            { header: 'Số Lượng Total', key: 'qty', width: 15 },
            { header: 'Người Giao', key: 'sender', width: 20 },
            { header: 'Người Nhận', key: 'receiver', width: 20 },
            { header: 'Trạng Thái', key: 'status', width: 15 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `LỊCH SỬ BÀN GIAO SẢN XUẤT - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            sheet.addRow({
                stt: idx + 1,
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---',
                part: item.part_name || item.product_name || '---',
                stage_from: item.delivery_stage || '---',
                stage_to: item.receiving_stage || '---',
                qty: item.quantity_total || 0,
                sender: item.sx_delivery_name || '---',
                receiver: item.sx_receipt_name || '---',
                status: item.status || '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
    };

    const fillAllInspectionsSheet = (sheet, data) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Mã Phiếu', key: 'ticket_code', width: 15 },
            { header: 'Loại Phiếu QC', key: 'type_label', width: 22 },
            { header: 'Công Đoạn', key: 'stage', width: 18 },
            { header: 'Tên Linh Kiện / SP', key: 'part', width: 25 },
            { header: 'Quy Cách Kỹ Thuật', key: 'spec', width: 22 },
            { header: 'Số Mẫu', key: 'sample_qty', width: 12 },
            { header: 'Số Lỗi', key: 'error_qty', width: 12 },
            { header: 'Người Kiểm Tra', key: 'inspector', width: 20 },
            { header: 'Kết Quả', key: 'result', width: 15 },
            { header: 'Thời Gian', key: 'time', width: 20 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `TẤT CẢ PHIẾU KIỂM TRA QC - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        data.forEach((item, idx) => {
            sheet.addRow({
                stt: idx + 1,
                ticket_code: item.ticket_code || `DA${item.id}`,
                type_label: item.type_label || 'Mẫu đầu tiên',
                stage: item.stage || '---',
                part: item.part_name || '---',
                spec: item.specification || '---',
                sample_qty: item.sample_qty || 1,
                error_qty: item.error_qty || 0,
                inspector: item.inspector_name || 'QC Staff',
                result: item.result || (item.is_pass ? 'ĐẠT' : 'LỖI'),
                time: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '---'
            });
        });

        applyDefaultBorders(sheet, 5, data.length + 4, cols.length);
    };

    const fillBOMSheet = (sheet, bData) => {
        const cols = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Tên Sản Phẩm', key: 'prod_name', width: 25 },
            { header: 'Tên Linh Kiện', key: 'part', width: 30 },
            { header: 'Kích Thước Quy Cách (D*R*C)', key: 'spec', width: 28 },
            { header: 'Công Đoạn Vào', key: 'in_stage', width: 20 },
            { header: 'Công Đoạn Ra', key: 'out_stage', width: 20 },
            { header: 'Đơn Vị', key: 'unit', width: 12 },
            { header: 'Định Mức / Qty', key: 'qty', width: 15 }
        ];
        sheet.columns = cols;
        formatExcelHeader(sheet, `DANH MỤC BOM CHI TIẾT SẢN XUẤT - PO: ${id}`, cols.length);
        sheet.getRow(4).values = cols.map(c => c.header);
        styleTableHeaderRow(sheet, 4, cols.length);

        bData.forEach((item, idx) => {
            const specStr = item.specification || (item.specs && item.specs[0]) || '---';
            sheet.addRow({
                stt: idx + 1,
                prod_name: item.product_name || '---',
                part: item.part_name || item.name || '---',
                spec: specStr,
                in_stage: item.input_stage || item.stage || '---',
                out_stage: item.output_stage || '---',
                unit: item.unit || 'Chiếc',
                qty: item.quantity || 1
            });
        });

        applyDefaultBorders(sheet, 5, bData.length + 4, cols.length);
    };

    const handleExportAllTabs = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            
            const sheet1 = workbook.addWorksheet('Dashboard Tổng Hợp');
            fillDashboardSheet(sheet1, dashboardMetrics);

            const sheet2 = workbook.addWorksheet('Danh Mục Sản Phẩm PO');
            fillProductsSummarySheet(sheet2, productsWithData);

            const sheet3 = workbook.addWorksheet('Lịch Sử Bàn Giao');
            fillHandoverSheet(sheet3, handoverData);

            const sheet4 = workbook.addWorksheet('Tất Cả Phiếu Kiểm Tra');
            fillAllInspectionsSheet(sheet4, allInspectionsData);

            const sheet5 = workbook.addWorksheet('BOM Chi Tiết');
            fillBOMSheet(sheet5, bomData);

            await triggerFileDownload(workbook, `Ho_So_CL_Full_PO_${id}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCurrentTab = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            if (activeTab === 'products') {
                const sheet = workbook.addWorksheet('Danh Mục Sản Phẩm PO');
                fillProductsSummarySheet(sheet, productsWithData);
            } else if (activeTab === 'others') {
                const sheet = workbook.addWorksheet('Dashboard Chất Lượng PO');
                fillDashboardSheet(sheet, dashboardMetrics);
            }
            await triggerFileDownload(workbook, `Ho_So_CL_PO_${id}_${activeTab}.xlsx`);
            setShowExportModal(false);
        } catch (error) {
            console.error("Lỗi xuất tab hiện tại:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const activeInspectionItem = inspectionModalData.item;
    const isInspectionPass = activeInspectionItem?.is_pass || 
                             activeInspectionItem?.conclusion === 'pass' || 
                             activeInspectionItem?.result === 'Đạt' || 
                             activeInspectionItem?.result === 'pass' || 
                             activeInspectionItem?.result === 'ĐẠT';
    const reportPartsList = getReportParts(activeInspectionItem);
    const reportErrorsList = getReportErrors(activeInspectionItem);
    const reportImagesList = (activeInspectionItem?.images || []).map(img => 
        typeof img === 'string' ? img : img.image_path || img.url
    ).filter(Boolean);

    const reportHistoryList = useMemo(() => {
        if (!activeInspectionItem) return [];
        if (Array.isArray(activeInspectionItem.edit_history) && activeInspectionItem.edit_history.length > 0) {
            return activeInspectionItem.edit_history;
        }
        if (activeInspectionItem.data_json) {
            try {
                const parsed = typeof activeInspectionItem.data_json === 'string' 
                    ? JSON.parse(activeInspectionItem.data_json) 
                    : activeInspectionItem.data_json;
                if (Array.isArray(parsed?.edit_history)) return parsed.edit_history;
            } catch (e) {}
        }
        return [];
    }, [activeInspectionItem]);

    return (
        <div className="quality-detail-container" style={{ padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .detail-card {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(123, 82, 51, 0.05);
                }
                .tab-container {
                    display: flex;
                    gap: 10px;
                    border-bottom: 1px solid #EADCC9;
                    margin-bottom: 1.5rem;
                    overflow-x: auto;
                    scrollbar-width: none;
                    padding-bottom: 2px;
                }
                .tab-btn {
                    padding: 0.65rem 1.4rem;
                    border: 1px solid transparent;
                    border-radius: 8px 8px 0 0;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #8D6E63;
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    white-space: nowrap;
                    margin-bottom: -1px;
                }
                .tab-btn.active {
                    color: #7B5233;
                    background-color: #FAF6F0;
                    border: 1px solid #EADCC9;
                    border-bottom-color: #FAF6F0;
                    box-shadow: 0 -2px 6px rgba(123, 82, 51, 0.05);
                }
                .tab-btn:hover:not(.active) {
                    background: #FAF6F0;
                    color: #7B5233;
                }

                /* Product Cards Grid */
                .product-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.25rem;
                }
                @media (min-width: 1024px) {
                    .product-grid { grid-template-columns: repeat(2, 1fr); }
                }

                .product-master-card {
                    background: #fff;
                    border: 1.5px solid #EADCC9;
                    border-radius: 14px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    transition: all 0.25s ease;
                    box-shadow: 0 2px 8px rgba(123, 82, 51, 0.04);
                }
                .product-master-card:hover {
                    border-color: #7B5233;
                    box-shadow: 0 8px 20px rgba(123, 82, 51, 0.1);
                    transform: translateY(-2px);
                }

                .card-header-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1.5px dashed #EADCC9;
                    padding-bottom: 0.75rem;
                }

                .card-label {
                    font-size: 0.68rem;
                    color: #8D6E63;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                .card-value {
                    font-size: 0.88rem;
                    color: #2D1A12;
                    font-weight: 700;
                }

                /* Metric Interactive Badges */
                .metric-box {
                    background: #FAF6F0;
                    border: 1px solid #EADCC9;
                    border-radius: 10px;
                    padding: 0.65rem 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }
                .metric-box:hover {
                    border-color: #7B5233;
                    background: #F5EBE1;
                    transform: scale(1.01);
                }

                /* Filter Pill Bar */
                .filter-pill-bar {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }
                .filter-pill {
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    border: 1px solid #EADCC9;
                    background: #fff;
                    color: #8D6E63;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                .filter-pill.active {
                    background: #7B5233;
                    color: #fff;
                    border-color: #7B5233;
                }

                /* Progress Bars */
                .progress-track {
                    width: 100%;
                    height: 7px;
                    background: #EADCC9;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 4px;
                }
                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.4s ease;
                }

                /* Table Styling */
                .custom-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.88rem;
                }
                .custom-table th {
                    background: #FAF6F0;
                    color: #7B5233;
                    font-weight: 800;
                    padding: 10px 12px;
                    text-align: left;
                    border-bottom: 2px solid #EADCC9;
                    white-space: nowrap;
                }
                .custom-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #FAF6F0;
                    color: #2D1A12;
                }
                .custom-table tr:hover {
                    background: #FAF9F6;
                }

                /* Modal Overlay */
                .modal-overlay {
                    position: fixed !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.75) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 999999 !important;
                    padding: 16px !important;
                    backdrop-filter: blur(2px) !important;
                }
                .modal-content {
                    background: #ffffff !important;
                    border-radius: 16px !important;
                    width: 100% !important;
                    max-width: 850px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    border: 2px solid #7B5233 !important;
                }
                .modal-header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #EADCC9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    background: #fff;
                    z-index: 10;
                }
                .modal-body { padding: 1.5rem; }
                .detail-row {
                    display: flex;
                    padding: 8px 0;
                    border-bottom: 1px solid #FAF6F0;
                }
                .detail-label {
                    flex: 0 0 160px;
                    font-size: 0.85rem;
                    color: #8D6E63;
                    font-weight: 700;
                }
                .detail-value {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #2D1A12;
                    font-weight: 600;
                }

                .kbd-shortcut-pill {
                    display: inline-block;
                    padding: 1px 5px;
                    border-radius: 4px;
                    background: #FFFFFF;
                    border: 1px solid #EADCC9;
                    font-family: monospace;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #7B5233;
                }
            `}} />

            {/* Top Info Banner */}
            <div className="detail-card card-shadow">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Đang tải thông tin đơn hàng...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '800' }}>MÃ ĐƠN HÀNG / PO</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#7B5233' }}>#{orderInfo?.order_code || id}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '800' }}>KHÁCH HÀNG</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2D1A12' }}>{orderInfo?.customer || '---'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '800' }}>SẢN PHẨM SẢN XUẤT</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2D1A12' }}>
                                {productsWithData.length} loại ({productsWithData.reduce((acc, p) => acc + p.orderQty, 0)} chiếc)
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowExportModal(true)}
                                style={{
                                    backgroundColor: '#7B5233',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 18px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 6px rgba(123, 82, 51, 0.15)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D4037'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                            >
                                <FileDown size={18} />
                                Xuất Excel PO
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2 Tabs Bar */}
            <div className="tab-container">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div className="detail-card card-shadow" style={{ padding: '1.25rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#7B5233', fontWeight: '700' }}>
                        Đang đồng bộ hồ sơ chất lượng toàn bộ sản phẩm...
                    </div>
                ) : (
                    <>
                        {/* TAB 1: SẢN PHẨM PO (GOM TOÀN BỘ 5 PHẦN VÀO 1) */}
                        {activeTab === 'products' && (
                            <div>
                                {/* Toolbar: Tìm kiếm, Lọc trạng thái, Đổi chế độ xem */}
                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    gap: '12px',
                                    marginBottom: '1.25rem'
                                }}>
                                    <div style={{ display: 'flex', gap: '8px', flex: '1 1 280px', maxWidth: '400px' }}>
                                        <div style={{ 
                                            position: 'relative', 
                                            width: '100%',
                                            display: 'flex', 
                                            alignItems: 'center' 
                                        }}>
                                            <Search size={16} style={{ position: 'absolute', left: '10px', color: '#8D6E63' }} />
                                            <input 
                                                type="text" 
                                                placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 34px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #EADCC9',
                                                    fontSize: '0.85rem',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Bộ lọc trạng thái */}
                                    <div className="filter-pill-bar">
                                        {[
                                            { id: 'all', label: `Tất cả (${productsWithData.length})` },
                                            { id: 'delivered', label: 'Đã có bàn giao' },
                                            { id: 'qc', label: 'Đã có kiểm tra QC' },
                                            { id: 'error', label: 'Có ghi nhận lỗi' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                className={`filter-pill ${productFilter === f.id ? 'active' : ''}`}
                                                onClick={() => setProductFilter(f.id)}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Nút đổi Cards / Table */}
                                    <div style={{ display: 'flex', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden' }}>
                                        <button 
                                            onClick={() => setProductViewMode('cards')}
                                            style={{
                                                padding: '6px 10px',
                                                border: 'none',
                                                background: productViewMode === 'cards' ? '#7B5233' : '#FAF6F0',
                                                color: productViewMode === 'cards' ? '#fff' : '#7B5233',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                fontSize: '0.8rem', fontWeight: '700'
                                            }}
                                            title="Xem dạng thẻ trực quan"
                                        >
                                            <Grid size={15} /> Thẻ
                                        </button>
                                        <button 
                                            onClick={() => setProductViewMode('table')}
                                            style={{
                                                padding: '6px 10px',
                                                border: 'none',
                                                background: productViewMode === 'table' ? '#7B5233' : '#FAF6F0',
                                                color: productViewMode === 'table' ? '#fff' : '#7B5233',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                fontSize: '0.8rem', fontWeight: '700'
                                            }}
                                            title="Xem dạng bảng tổng hợp"
                                        >
                                            <List size={15} /> Bảng
                                        </button>
                                    </div>
                                </div>

                                {/* CHẾ ĐỘ 1: DẠNG THẺ TRỰC QUAN (CARDS VIEW) */}
                                {productViewMode === 'cards' && (
                                    <div className="product-grid">
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                                <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                                <p>Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</p>
                                            </div>
                                        ) : (
                                            filteredProducts.map((p) => (
                                                <div key={p.index} className="product-master-card">
                                                    {/* Phần 1: Header Sản phẩm & SKU */}
                                                    <div className="card-header-bar">
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ 
                                                                    backgroundColor: '#7B5233', 
                                                                    color: '#fff', 
                                                                    fontSize: '0.78rem', 
                                                                    fontWeight: '800', 
                                                                    padding: '2px 8px', 
                                                                    borderRadius: '6px' 
                                                                }}>
                                                                    {p.sku || 'SKU-N/A'}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '600' }}>
                                                                    Đơn vị: {p.unit || 'Chiếc'}
                                                                </span>
                                                            </div>
                                                            <div 
                                                                style={{ 
                                                                    fontSize: '1.05rem', 
                                                                    fontWeight: '800', 
                                                                    color: '#2D1A12', 
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px'
                                                                }}
                                                                onClick={(e) => handleOpenDrillModal(e, 'bom', p)}
                                                                title="Nhấn để xem BOM chi tiết của sản phẩm"
                                                            >
                                                                {p.name}
                                                                <ExternalLink size={14} color="#7B5233" />
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                                                                Quy cách: <span style={{ color: '#2D1A12', fontWeight: '600' }}>{p.specification || '---'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Nút Xem Bản vẽ & BOM */}
                                                        <button
                                                            onClick={(e) => handleOpenDrillModal(e, 'bom', p)}
                                                            style={{
                                                                backgroundColor: '#FAF6F0',
                                                                color: '#7B5233',
                                                                border: '1px solid #EADCC9',
                                                                borderRadius: '8px',
                                                                padding: '6px 12px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: '800',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.color = '#fff'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; e.currentTarget.style.color = '#7B5233'; }}
                                                        >
                                                            <Layers size={14} />
                                                            BOM ({p.bomCount})
                                                        </button>
                                                    </div>

                                                    {/* Phần 2: Lệnh Sản Xuất */}
                                                    <div style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: 'repeat(3, 1fr)', 
                                                        gap: '8px', 
                                                        backgroundColor: '#FAF9F6', 
                                                        padding: '8px 10px', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #FAF0E6' 
                                                    }}>
                                                        <div>
                                                            <div className="card-label">S.LƯỢNG ĐẶT HÀNG</div>
                                                            <div className="card-value" style={{ color: '#7B5233', fontSize: '0.95rem' }}>
                                                                {p.orderQty} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{p.unit || 'chiếc'}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="card-label">VÀO LỆNH S.XUẤT</div>
                                                            <div className="card-value" style={{ color: '#2E7D32', fontSize: '0.95rem' }}>
                                                                {p.productionQty} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{p.unit || 'chiếc'}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="card-label">BÙ HAO</div>
                                                            <div className="card-value" style={{ color: '#E65100', fontSize: '0.95rem' }}>
                                                                {p.lossQty} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{p.unit || 'chiếc'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Phần 3 & 4 & 5: Bàn Giao, QC và Lỗi (Interactive Badges) */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {/* Mục Bàn Giao */}
                                                        <div 
                                                            className="metric-box"
                                                            onClick={(e) => handleOpenDrillModal(e, 'handovers', p)}
                                                            title="Nhấn để xem toàn bộ danh sách phiếu bàn giao của sản phẩm này"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Truck size={18} color="#7B5233" />
                                                                <div>
                                                                    <div className="card-label">PHIẾU BÀN GIAO LIÊN QUAN</div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2D1A12' }}>
                                                                        {p.handoverCount} phiếu ({p.handoverQty} chiếc đã giao)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    fontWeight: '800', 
                                                                    color: p.deliveryRate >= 100 ? '#2E7D32' : '#7B5233' 
                                                                }}>
                                                                    {p.deliveryRate}% Tiến độ
                                                                </span>
                                                                <div className="progress-track" style={{ width: '80px' }}>
                                                                    <div 
                                                                        className="progress-fill" 
                                                                        style={{ 
                                                                            width: `${Math.min(p.deliveryRate, 100)}%`, 
                                                                            backgroundColor: p.deliveryRate >= 100 ? '#2E7D32' : '#7B5233' 
                                                                        }} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Mục Kiểm Tra QC */}
                                                        <div 
                                                            className="metric-box"
                                                            onClick={(e) => handleOpenDrillModal(e, 'inspections', p)}
                                                            title="Nhấn để xem toàn bộ danh sách phiếu kiểm tra QC của sản phẩm này"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <ClipboardCheck size={18} color="#2E7D32" />
                                                                <div>
                                                                    <div className="card-label">PHIẾU KIỂM TRA QC</div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2D1A12' }}>
                                                                        {p.inspectionCount} phiếu ({p.passCount} Đạt / {p.failCount} K.Đạt)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    fontWeight: '800', 
                                                                    color: p.passRate >= 95 ? '#2E7D32' : '#C62828' 
                                                                }}>
                                                                    {p.passRate}% Đạt
                                                                </span>
                                                                <div className="progress-track" style={{ width: '80px' }}>
                                                                    <div 
                                                                        className="progress-fill" 
                                                                        style={{ 
                                                                            width: `${p.passRate}%`, 
                                                                            backgroundColor: p.passRate >= 95 ? '#2E7D32' : '#C62828' 
                                                                        }} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Mục Số Lượng Lỗi */}
                                                        <div 
                                                            className="metric-box"
                                                            style={{ 
                                                                backgroundColor: p.defectCount > 0 ? '#FFEBEE' : '#E8F5E9',
                                                                borderColor: p.defectCount > 0 ? '#FFCDD2' : '#C8E6C9'
                                                            }}
                                                            onClick={(e) => handleOpenDrillModal(e, 'defects', p)}
                                                            title="Nhấn để xem chi tiết các lỗi phát hiện & phiếu không đạt"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {p.defectCount > 0 ? (
                                                                    <AlertTriangle size={18} color="#C62828" />
                                                                ) : (
                                                                    <CheckCircle2 size={18} color="#2E7D32" />
                                                                )}
                                                                <div>
                                                                    <div className="card-label" style={{ color: p.defectCount > 0 ? '#C62828' : '#2E7D32' }}>
                                                                        SỐ LƯỢNG LỖI PHÁT HIỆN
                                                                    </div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: p.defectCount > 0 ? '#C62828' : '#2E7D32' }}>
                                                                        {p.defectCount > 0 ? `${p.defectCount} lỗi ghi nhận (${p.failCount} phiếu k.đạt)` : '0 lỗi phát hiện (Hoàn hảo)'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: '800', 
                                                                color: p.defectCount > 0 ? '#C62828' : '#2E7D32',
                                                                display: 'flex', alignItems: 'center', gap: '2px'
                                                            }}>
                                                                Chi tiết <ChevronRight size={14} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* CHẾ ĐỘ 2: DẠNG BẢNG TỔNG HỢP (TABLE VIEW) */}
                                {productViewMode === 'table' && (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="custom-table">
                                            <thead>
                                                <tr>
                                                    <th>STT</th>
                                                    <th>Mã SKU</th>
                                                    <th>Tên Sản Phẩm</th>
                                                    <th>Quy Cách</th>
                                                    <th style={{ textAlign: 'right' }}>SL Đặt</th>
                                                    <th style={{ textAlign: 'right' }}>Vào Lệnh</th>
                                                    <th style={{ textAlign: 'center' }}>Phiếu Bàn Giao</th>
                                                    <th style={{ textAlign: 'center' }}>Phiếu QC</th>
                                                    <th style={{ textAlign: 'center' }}>Số Lỗi</th>
                                                    <th style={{ textAlign: 'center' }}>Tỷ Lệ Đạt</th>
                                                    <th style={{ textAlign: 'center' }}>Hành Động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredProducts.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#8D6E63' }}>
                                                            Không có sản phẩm nào phù hợp.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredProducts.map((p, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                                                            <td>
                                                                <span style={{ backgroundColor: '#7B5233', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
                                                                    {p.sku}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontWeight: '700', color: '#2D1A12' }}>{p.name}</td>
                                                            <td>{p.specification || '---'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: '700' }}>{p.orderQty}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#2E7D32' }}>{p.productionQty}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => handleOpenDrillModal(e, 'handovers', p)}
                                                                    style={{
                                                                        background: '#FAF6F0',
                                                                        border: '1px solid #EADCC9',
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: '700',
                                                                        color: '#7B5233',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {p.handoverCount} phiếu ({p.handoverQty}c)
                                                                </button>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => handleOpenDrillModal(e, 'inspections', p)}
                                                                    style={{
                                                                        background: '#E8F5E9',
                                                                        border: '1px solid #C8E6C9',
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: '700',
                                                                        color: '#2E7D32',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {p.inspectionCount} phiếu ({p.passCount} đạt)
                                                                </button>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => handleOpenDrillModal(e, 'defects', p)}
                                                                    style={{
                                                                        background: p.defectCount > 0 ? '#FFEBEE' : '#FAF6F0',
                                                                        border: `1px solid ${p.defectCount > 0 ? '#FFCDD2' : '#EADCC9'}`,
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: '800',
                                                                        color: p.defectCount > 0 ? '#C62828' : '#7B5233',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {p.defectCount} lỗi
                                                                </button>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    fontWeight: '800', 
                                                                    color: p.passRate >= 95 ? '#2E7D32' : '#C62828',
                                                                    fontSize: '0.82rem'
                                                                }}>
                                                                    {p.passRate}%
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => handleOpenDrillModal(e, 'bom', p)}
                                                                    style={{
                                                                        backgroundColor: '#7B5233',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        padding: '4px 10px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Xem BOM
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: KHÁC (DASHBOARD TỔNG HỢP TOÀN BỘ PO) */}
                        {activeTab === 'others' && (
                            <div>
                                {/* Hàng 1: 4 Executive KPI Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#FAF6F0', padding: '1.1rem', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="card-label">TỔNG SẢN PHẨM PO</div>
                                            <Package size={20} color="#7B5233" />
                                        </div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#7B5233', marginTop: '4px' }}>
                                            {dashboardMetrics.totalProducts} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#8D6E63' }}>loại sản phẩm</span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                                            Tổng đặt: <strong style={{ color: '#2D1A12' }}>{dashboardMetrics.totalOrderQty}</strong> | Vào lệnh: <strong style={{ color: '#2E7D32' }}>{dashboardMetrics.totalProductionQty}</strong>
                                        </div>
                                    </div>

                                    <div style={{ background: '#FAF6F0', padding: '1.1rem', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="card-label">BÀN GIAO TOÀN PO</div>
                                            <Truck size={20} color="#7B5233" />
                                        </div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#7B5233', marginTop: '4px' }}>
                                            {dashboardMetrics.totalHandovers} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#8D6E63' }}>phiếu giao</span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                                            Đã luân chuyển: <strong style={{ color: '#2D1A12' }}>{dashboardMetrics.totalDeliveredQty}</strong> chi tiết
                                        </div>
                                    </div>

                                    <div style={{ background: '#FAF6F0', padding: '1.1rem', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="card-label">TỶ LỆ ĐẠT QC TOÀN PO</div>
                                            <ShieldCheck size={20} color={dashboardMetrics.overallPassRate >= 95 ? '#2E7D32' : '#E65100'} />
                                        </div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: dashboardMetrics.overallPassRate >= 95 ? '#2E7D32' : '#E65100', marginTop: '4px' }}>
                                            {dashboardMetrics.overallPassRate}%
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                                            <strong style={{ color: '#2E7D32' }}>{dashboardMetrics.totalPassInspections} Đạt</strong> / <strong style={{ color: '#C62828' }}>{dashboardMetrics.totalFailInspections} K.Đạt</strong> ({dashboardMetrics.totalInspections} phiếu)
                                        </div>
                                    </div>

                                    <div style={{ background: '#FAF6F0', padding: '1.1rem', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="card-label">SỰ CỐ & TỔNG LỖI</div>
                                            <AlertTriangle size={20} color={dashboardMetrics.totalDefects > 0 ? '#C62828' : '#2E7D32'} />
                                        </div>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: dashboardMetrics.totalDefects > 0 ? '#C62828' : '#2E7D32', marginTop: '4px' }}>
                                            {dashboardMetrics.totalDefects} <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#8D6E63' }}>lỗi ghi nhận</span>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#8D6E63', marginTop: '2px' }}>
                                            Đánh giá: {dashboardMetrics.totalDefects === 0 ? <strong style={{ color: '#2E7D32' }}>Chuẩn chất lượng</strong> : <strong style={{ color: '#C62828' }}>Cần theo dõi sát</strong>}
                                        </div>
                                    </div>
                                </div>

                                {/* Hàng 2: Phân bố loại phiếu QC & Phân tích Công đoạn */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    {/* Phân bố Loại Phiếu QC */}
                                    <div style={{ background: '#fff', border: '1px solid #EADCC9', borderRadius: '12px', padding: '1.25rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ClipboardCheck size={18} /> Phân Loại Phiếu Kiểm Định QC
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {[
                                                { label: 'Mẫu đầu tiên (First Article)', count: dashboardMetrics.typeBreakdown.first_sample, color: '#7B5233' },
                                                { label: 'Kiểm tra công đoạn', count: dashboardMetrics.typeBreakdown.stage, color: '#1565C0' },
                                                { label: 'Tái kiểm tra (Re-inspect)', count: dashboardMetrics.typeBreakdown.re_inspect, color: '#E65100' },
                                                { label: 'Thông số kỹ thuật', count: dashboardMetrics.typeBreakdown.spec, color: '#2E7D32' }
                                            ].map((item, i) => {
                                                const pct = dashboardMetrics.totalInspections > 0 ? Math.round((item.count / dashboardMetrics.totalInspections) * 100) : 0;
                                                return (
                                                    <div key={i}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '700', marginBottom: '3px' }}>
                                                            <span>{item.label}</span>
                                                            <span style={{ color: item.color }}>{item.count} phiếu ({pct}%)</span>
                                                        </div>
                                                        <div className="progress-track">
                                                            <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Phân tích Chất Lượng Theo Công Đoạn */}
                                    <div style={{ background: '#fff', border: '1px solid #EADCC9', borderRadius: '12px', padding: '1.25rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sliders size={18} /> Chất Lượng Theo Công Đoạn
                                        </h4>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Công Đoạn</th>
                                                        <th style={{ textAlign: 'center' }}>Số Phiếu</th>
                                                        <th style={{ textAlign: 'center' }}>Đạt</th>
                                                        <th style={{ textAlign: 'center' }}>Lỗi</th>
                                                        <th style={{ textAlign: 'right' }}>Tỷ Lệ Đạt</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dashboardMetrics.stagesList.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: '#8D6E63' }}>
                                                                Chưa có dữ liệu kiểm định công đoạn.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        dashboardMetrics.stagesList.map((stg, i) => {
                                                            const stgPassRate = stg.count > 0 ? Math.round((stg.pass / stg.count) * 100) : 100;
                                                            return (
                                                                <tr key={i}>
                                                                    <td style={{ fontWeight: '700', color: '#7B5233' }}>{stg.stage}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{stg.count}</td>
                                                                    <td style={{ textAlign: 'center', color: '#2E7D32', fontWeight: '700' }}>{stg.pass}</td>
                                                                    <td style={{ textAlign: 'center', color: stg.errors > 0 ? '#C62828' : '#8D6E63', fontWeight: '700' }}>
                                                                        {stg.errors}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right', fontWeight: '800', color: stgPassRate >= 95 ? '#2E7D32' : '#C62828' }}>
                                                                        {stgPassRate}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Hàng 3: Ma Trận Đánh Giá Toàn Bộ Sản Phẩm */}
                                <div style={{ background: '#fff', border: '1px solid #EADCC9', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Layers size={18} /> Ma Trận Tiến Độ & Chất Lượng Từng Sản Phẩm Trong PO
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="custom-table">
                                            <thead>
                                                <tr>
                                                    <th>STT</th>
                                                    <th>Mã SKU</th>
                                                    <th>Tên Sản Phẩm</th>
                                                    <th style={{ textAlign: 'right' }}>SL Đặt</th>
                                                    <th style={{ textAlign: 'center' }}>Bàn Giao</th>
                                                    <th style={{ textAlign: 'center' }}>Phiếu QC</th>
                                                    <th style={{ textAlign: 'center' }}>Số Lỗi</th>
                                                    <th style={{ textAlign: 'center' }}>Chất Lượng</th>
                                                    <th style={{ textAlign: 'center' }}>Tình Trạng</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productsWithData.map((p, idx) => {
                                                    const isGood = p.passRate >= 95 && p.defectCount === 0;
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                                                            <td style={{ fontWeight: '800', color: '#7B5233' }}>{p.sku}</td>
                                                            <td style={{ fontWeight: '700' }}>{p.name}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: '700' }}>{p.orderQty}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{ fontWeight: '700', color: '#7B5233' }}>
                                                                    {p.handoverQty}c ({p.deliveryRate}%)
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {p.inspectionCount} phiếu
                                                            </td>
                                                            <td style={{ textAlign: 'center', color: p.defectCount > 0 ? '#C62828' : '#2E7D32', fontWeight: '800' }}>
                                                                {p.defectCount}
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{ fontWeight: '800', color: p.passRate >= 95 ? '#2E7D32' : '#C62828' }}>
                                                                    {p.passRate}% Đạt
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    padding: '3px 10px', 
                                                                    borderRadius: '12px', 
                                                                    fontSize: '0.72rem', 
                                                                    fontWeight: '800',
                                                                    backgroundColor: isGood ? '#E8F5E9' : (p.defectCount > 0 ? '#FFEBEE' : '#FFF3E0'),
                                                                    color: isGood ? '#2E7D32' : (p.defectCount > 0 ? '#C62828' : '#E65100')
                                                                }}>
                                                                    {isGood ? 'ĐẠT CHUẨN' : (p.defectCount > 0 ? 'CÓ LỖI' : 'ĐANG THEO DÕI')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Hàng 4: Nhật Ký Kiểm Soát Nhân Sự & Ghi Chú PO */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                    <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={18} /> Đội Ngũ Nhân Sự Kiểm Soát PO
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                            {dashboardMetrics.inspectors.length === 0 ? (
                                                <span style={{ fontSize: '0.85rem', color: '#8D6E63' }}>Chưa ghi nhận tên nhân sự kiểm tra.</span>
                                            ) : (
                                                dashboardMetrics.inspectors.map((ins, i) => (
                                                    <span key={i} style={{ 
                                                        backgroundColor: '#fff', 
                                                        border: '1px solid #EADCC9', 
                                                        padding: '4px 10px', 
                                                        borderRadius: '16px', 
                                                        fontSize: '0.8rem', 
                                                        fontWeight: '700',
                                                        color: '#2D1A12'
                                                    }}>
                                                        QC: {ins}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ background: '#FAF6F0', padding: '1.25rem', borderRadius: '10px', border: '1px solid #EADCC9' }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Info size={18} /> Ghi Chú & Tình Trạng Hồ Sơ PO
                                        </h4>
                                        <p style={{ fontSize: '0.82rem', color: '#8D6E63', lineHeight: '1.6', margin: 0 }}>
                                            Toàn bộ hồ sơ chất lượng của PO #{id} được số hóa tập trung trên hệ thống SmartFlow. 
                                            Quản đốc và bộ phận QC có thể đối chiếu chéo giữa phiếu bàn giao, phiếu kiểm tra và cấu trúc BOM của từng sản phẩm.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ========================================================================= */}
            {/* DRILL-DOWN MODAL (BOM, HANDOVERS, INSPECTIONS, DEFECTS OF A PRODUCT) */}
            {/* ========================================================================= */}
            {drillModal.isOpen && drillModal.product && ReactDOM.createPortal(
                <div className="modal-overlay" onClick={handleCloseDrillModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '950px' }}>
                        {/* Header Modal Drill */}
                        <div className="modal-header">
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '800', textTransform: 'uppercase' }}>
                                    {drillModal.type === 'bom' && 'BẢN VẼ & CẤU TRÚC BOM LINH KIỆN'}
                                    {drillModal.type === 'handovers' && 'LỊCH SỬ BÀN GIAO CHI TIẾT'}
                                    {drillModal.type === 'inspections' && 'HỒ SƠ KIỂM TRA QC'}
                                    {drillModal.type === 'defects' && 'DANH SÁCH LỖI & SỰ CỐ QC PHÁT HIỆN'}
                                </div>
                                <h3 style={{ margin: '2px 0 0 0', color: '#2D1A12', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ backgroundColor: '#7B5233', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                                        {drillModal.product.sku}
                                    </span>
                                    {drillModal.product.name}
                                </h3>
                            </div>
                            <button 
                                onClick={handleCloseDrillModal} 
                                style={{ border: 'none', background: '#FAF6F0', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={18} color="#7B5233" />
                            </button>
                        </div>

                        {/* Body Modal Drill */}
                        <div className="modal-body">
                            {/* CASE 1: BOM & BẢN VẼ CỦA SẢN PHẨM */}
                            {drillModal.type === 'bom' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: '700' }}>
                                            Tổng số linh kiện cấu thành: <strong>{drillModal.product.boms.length} chi tiết</strong>
                                        </div>
                                        {/* Lọc công đoạn BOM */}
                                        <div className="filter-pill-bar">
                                            {['all', 'Tạo phôi', 'Định hình', 'Lắp ráp', 'Sơn', 'Đóng gói'].map(stg => (
                                                <button
                                                    key={stg}
                                                    className={`filter-pill ${drillStageFilter === stg ? 'active' : ''}`}
                                                    onClick={() => setDrillStageFilter(stg)}
                                                >
                                                    {stg === 'all' ? 'Tất cả công đoạn' : stg}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="custom-table">
                                            <thead>
                                                <tr>
                                                    <th>STT</th>
                                                    <th>Tên Linh Kiện</th>
                                                    <th>Mã SKU</th>
                                                    <th>Quy Cách (D*R*C mm)</th>
                                                    <th>Công Đoạn Vào</th>
                                                    <th>Công Đoạn Ra</th>
                                                    <th style={{ textAlign: 'right' }}>Định Mức / Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {drillModal.product.boms
                                                    .filter(b => {
                                                        if (drillStageFilter === 'all') return true;
                                                        const bStg = `${b.input_stage || ''} ${b.output_stage || ''} ${b.stage || ''}`.toLowerCase();
                                                        return bStg.includes(drillStageFilter.toLowerCase());
                                                    })
                                                    .map((item, bIdx) => (
                                                        <tr key={bIdx}>
                                                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{bIdx + 1}</td>
                                                            <td style={{ fontWeight: '700', color: '#7B5233' }}>{item.part_name || item.name}</td>
                                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku || '---'}</td>
                                                            <td style={{ fontWeight: '600' }}>{item.specification || (item.specs && item.specs.join(', ')) || '---'}</td>
                                                            <td>
                                                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#FAF6F0', color: '#7B5233', fontSize: '0.78rem', fontWeight: '700' }}>
                                                                    {item.input_stage || item.stage || 'Sơ chế'}
                                                                </span>
                                                            </td>
                                                            <td>{item.output_stage || '---'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: '800' }}>
                                                                {item.quantity || 1} {item.unit || 'chiếc'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* CASE 2: DANH SÁCH PHIẾU BÀN GIAO CỦA SẢN PHẨM */}
                            {drillModal.type === 'handovers' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.88rem', color: '#7B5233', fontWeight: '700' }}>
                                            Danh sách {drillModal.product.handovers.length} phiếu bàn giao ({drillModal.product.handoverQty} chiếc đã luân chuyển)
                                        </div>
                                    </div>

                                    {drillModal.product.handovers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                            <Truck size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                            <p>Chưa có phiếu bàn giao nào cho sản phẩm này.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                            {drillModal.product.handovers.map((hItem, hIdx) => {
                                                const st = getStatusStyle(hItem.status);
                                                return (
                                                    <div 
                                                        key={hIdx}
                                                        style={{
                                                            background: '#fff',
                                                            border: '1px solid #EADCC9',
                                                            borderRadius: '10px',
                                                            padding: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}
                                                        onClick={(e) => handleOpenHandoverModal(e, hItem)}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EADCC9'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#7B5233' }}>
                                                                {formatDate(hItem.created_at)} {formatTime(hItem.created_at)}
                                                            </span>
                                                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '800', backgroundColor: st.bg, color: st.color }}>
                                                                {(hItem.status || 'Chờ').toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.88rem' }}>
                                                            {hItem.part_name || hItem.product_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                                                            Công đoạn: <strong style={{ color: '#2D1A12' }}>{hItem.delivery_stage} → {hItem.receiving_stage}</strong>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #EADCC9', paddingTop: '4px' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#8D6E63' }}>Giao: {hItem.sx_delivery_name || '---'}</span>
                                                            <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#7B5233' }}>
                                                                {hItem.quantity_total} chiếc
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CASE 3: TẤT CẢ PHIẾU KIỂM TRA QC CỦA SẢN PHẨM */}
                            {drillModal.type === 'inspections' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.88rem', color: '#7B5233', fontWeight: '700' }}>
                                            Hồ sơ {drillModal.product.inspections.length} phiếu QC ({drillModal.product.passCount} Đạt / {drillModal.product.failCount} K.Đạt)
                                        </div>
                                    </div>

                                    {drillModal.product.inspections.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                            <ClipboardCheck size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                            <p>Chưa có phiếu kiểm tra QC nào cho sản phẩm này.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
                                            {drillModal.product.inspections.map((insItem, insIdx) => {
                                                const st = getStatusStyle(insItem.result);
                                                return (
                                                    <div 
                                                        key={insIdx}
                                                        style={{
                                                            background: '#fff',
                                                            border: '1px solid #EADCC9',
                                                            borderRadius: '10px',
                                                            padding: '0.85rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px'
                                                        }}
                                                        onClick={(e) => handleOpenInspectionDetail(e, insItem, drillModal.product.inspections, insIdx)}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EADCC9'; e.currentTarget.style.backgroundColor = '#fff'; }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontWeight: '800', color: '#7B5233', fontSize: '0.85rem' }}>{insItem.ticket_code}</span>
                                                                <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 6px', borderRadius: '10px', background: '#FAF6F0', color: '#7B5233', border: '1px solid #EADCC9' }}>
                                                                    {insItem.type_label}
                                                                </span>
                                                            </div>
                                                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: st.bg, color: st.color }}>
                                                                {insItem.result}
                                                            </span>
                                                        </div>

                                                        <div style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.85rem' }}>
                                                            {insItem.part_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>
                                                            Công đoạn: <strong style={{ color: '#2D1A12' }}>{insItem.stage || 'QC'}</strong> | Quy cách: {insItem.specification || '---'}
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #EADCC9', paddingTop: '4px', fontSize: '0.75rem' }}>
                                                            <span>Mẫu kiểm: <strong>{insItem.sample_qty || 1}</strong> | Lỗi: <strong style={{ color: insItem.error_qty > 0 ? '#C62828' : '#2E7D32' }}>{insItem.error_qty || 0}</strong></span>
                                                            <span style={{ color: '#8D6E63' }}>QC: {insItem.inspector_name}</span>
                                                        </div>
                                                        {renderImageGallery(insItem.images)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CASE 4: CHI TIẾT CÁC LỖI & SỰ CỐ QC */}
                            {drillModal.type === 'defects' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.88rem', color: '#C62828', fontWeight: '800' }}>
                                            Tổng số lỗi phát hiện: {drillModal.product.defectCount} lỗi ({drillModal.product.failCount} phiếu không đạt)
                                        </div>
                                    </div>

                                    {drillModal.product.defects.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem', color: '#2E7D32' }}>
                                            <CheckCircle2 size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                                            <p style={{ fontWeight: '700', fontSize: '1.05rem' }}>Tuyệt vời! Sản phẩm này không ghi nhận lỗi nào.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {drillModal.product.defects.map((defItem, dIdx) => (
                                                <div 
                                                    key={dIdx}
                                                    style={{
                                                        background: '#FFEBEE',
                                                        border: '1px solid #FFCDD2',
                                                        borderRadius: '10px',
                                                        padding: '1rem',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => handleOpenInspectionDetail(e, defItem, drillModal.product.defects, dIdx)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: '800', color: '#C62828', fontSize: '0.9rem' }}>{defItem.ticket_code}</span>
                                                            <span style={{ background: '#fff', color: '#C62828', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid #FFCDD2' }}>
                                                                {defItem.type_label}
                                                            </span>
                                                        </div>
                                                        <span style={{ backgroundColor: '#C62828', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800' }}>
                                                            {defItem.error_qty || 1} LỖI PHÁT HIỆN
                                                        </span>
                                                    </div>

                                                    <div style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.9rem' }}>
                                                        {defItem.part_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: '#5D4037', marginTop: '2px' }}>
                                                        Công đoạn xảy ra lỗi: <strong style={{ color: '#C62828' }}>{defItem.stage || 'QC'}</strong> | Người kiểm tra: {defItem.inspector_name} | Thời gian: {formatDate(defItem.created_at)}
                                                    </div>

                                                    {defItem.note && (
                                                        <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FFCDD2', marginTop: '8px', fontSize: '0.82rem', color: '#C62828' }}>
                                                            <strong>Ghi chú lỗi từ QC:</strong> {defItem.note}
                                                        </div>
                                                    )}

                                                    {renderImageGallery(defItem.images)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ========================================================================= */}
            {/* RICH INSPECTION DETAIL MODAL (KHỚP HOÀN TOÀN ẢNH 2 DO NGƯỜI DÙNG CUNG CẤP) */}
            {/* ========================================================================= */}
            {inspectionModalData.isOpen && activeInspectionItem && ReactDOM.createPortal(
                <div 
                    className="modal-overlay" 
                    onClick={handleCloseInspectionDetail}
                >
                    <div 
                        onClick={e => e.stopPropagation()} 
                        style={{
                            width: '100%',
                            maxWidth: '740px',
                            maxHeight: '90vh',
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            border: '1.5px solid #EADCC9'
                        }}
                    >
                        {/* 1. MODAL HEADER (Khớp 100% Ảnh 2) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 22px',
                            backgroundColor: '#FAF6F0',
                            borderBottom: '1.5px solid #EADCC9'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#7B5233',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 5px rgba(123, 82, 51, 0.25)',
                                    flexShrink: 0
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
                                        Chi tiết phiếu kiểm tra
                                    </h3>
                                    <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 600, marginTop: '2px' }}>
                                        Mã phiếu: <strong style={{ color: '#2D1A12' }}>#{activeInspectionItem.batch_no || activeInspectionItem.ticket_code || id}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Header Right: Counter pill + Result Badge + Close Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {inspectionModalData.list.length > 0 && (
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #EADCC9',
                                            fontSize: '0.82rem',
                                            fontWeight: 800,
                                            color: '#7B5233',
                                            letterSpacing: '0.2px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}
                                        title={`Phiếu ${inspectionModalData.currentIndex + 1} / ${inspectionModalData.list.length}`}
                                    >
                                        {inspectionModalData.currentIndex + 1} / {inspectionModalData.list.length}
                                    </div>
                                )}

                                {isInspectionPass ? (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        backgroundColor: '#ECFDF5',
                                        color: '#059669',
                                        border: '1.5px solid #A7F3D0',
                                        boxShadow: '0 1px 2px rgba(16, 185, 129, 0.15)'
                                    }}>
                                        <CheckCircle2 size={15} /> ĐẠT
                                    </span>
                                ) : (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.82rem',
                                        fontWeight: 800,
                                        backgroundColor: '#FEF2F2',
                                        color: '#DC2626',
                                        border: '1.5px solid #FECACA',
                                        boxShadow: '0 1px 2px rgba(239, 68, 68, 0.15)'
                                    }}>
                                        <AlertTriangle size={15} /> KHÔNG ĐẠT
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCloseInspectionDetail}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #EADCC9',
                                        backgroundColor: '#FFFFFF',
                                        color: '#8D6E63',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                                        e.currentTarget.style.color = '#DC2626';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                                        e.currentTarget.style.color = '#8D6E63';
                                    }}
                                    title="Đóng (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* 2. TAB NAVIGATION (Thông tin / Chi tiết) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1.5px solid #EADCC9',
                            backgroundColor: '#FAF6F0',
                            padding: '0 22px'
                        }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setInspectionModalData(prev => ({ ...prev, modalTab: 'info' }))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 18px',
                                        border: 'none',
                                        borderBottom: inspectionModalData.modalTab === 'info' ? '3px solid #7B5233' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: inspectionModalData.modalTab === 'info' ? '#7B5233' : '#8D6E63',
                                        fontWeight: inspectionModalData.modalTab === 'info' ? 800 : 600,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Info size={16} />
                                    <span>Thông tin</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setInspectionModalData(prev => ({ ...prev, modalTab: 'details' }))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 18px',
                                        border: 'none',
                                        borderBottom: inspectionModalData.modalTab === 'details' ? '3px solid #7B5233' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: inspectionModalData.modalTab === 'details' ? '#7B5233' : '#8D6E63',
                                        fontWeight: inspectionModalData.modalTab === 'details' ? 800 : 600,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Layers size={16} />
                                    <span>Chi tiết</span>
                                    {reportPartsList.length > 0 && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            backgroundColor: inspectionModalData.modalTab === 'details' ? '#7B5233' : '#EADCC9',
                                            color: inspectionModalData.modalTab === 'details' ? '#FFFFFF' : '#7B5233',
                                            fontWeight: 700
                                        }}>
                                            {reportPartsList.length}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setInspectionModalData(prev => ({ ...prev, modalTab: 'history' }))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 18px',
                                        border: 'none',
                                        borderBottom: inspectionModalData.modalTab === 'history' ? '3px solid #7B5233' : '3px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: inspectionModalData.modalTab === 'history' ? '#7B5233' : '#8D6E63',
                                        fontWeight: inspectionModalData.modalTab === 'history' ? 800 : 600,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <History size={16} />
                                    <span>Lịch sử</span>
                                    {reportHistoryList.length > 0 && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            backgroundColor: inspectionModalData.modalTab === 'history' ? '#7B5233' : '#EADCC9',
                                            color: inspectionModalData.modalTab === 'history' ? '#FFFFFF' : '#7B5233',
                                            fontWeight: 700
                                        }}>
                                            {reportHistoryList.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#8D6E63', fontWeight: 600 }}>
                                <span>Phím tắt:</span>
                                <span className="kbd-shortcut-pill">Tab</span>
                                <span>đổi tab</span>
                                <span style={{ margin: '0 2px' }}>•</span>
                                <span className="kbd-shortcut-pill">←</span>
                                <span className="kbd-shortcut-pill">→</span>
                                <span>đổi phiếu</span>
                            </div>
                        </div>

                        {/* 3. MODAL BODY (Khớp 100% Ảnh 2) */}
                        <div style={{ padding: '20px 22px', maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                            {inspectionModalData.modalTab === 'info' && (
                                <>
                                    {/* CARD THÔNG TIN TỔNG QUAN (3 DÒNG x 3 CỘT KHỚP ẢNH 2) */}
                                    <div style={{
                                        backgroundColor: '#FCFBF9',
                                        border: '1.5px solid #EADCC9',
                                        borderRadius: '12px',
                                        padding: '14px 16px',
                                        marginBottom: '16px',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '12px 16px',
                                        fontSize: '0.88rem'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                MÃ LÔ / PO
                                            </span>
                                            <strong style={{ color: '#7B5233', fontSize: '0.92rem' }}>
                                                {activeInspectionItem.batch_no || id}
                                            </strong>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                LOẠI KIỂM TRA
                                            </span>
                                            <div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#EFF6FF',
                                                    color: '#1D4ED8',
                                                    border: '1px solid #BFDBFE'
                                                }}>
                                                    {activeInspectionItem.type_label || activeInspectionItem.inspection_type || 'Ghi nhận lỗi hàng ngày'}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                NGƯỜI KIỂM TRA QC
                                            </span>
                                            <strong style={{ color: '#2D1A12' }}>
                                                {activeInspectionItem.inspector_name || 'QC Inspector'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                NGÀY GHI NHẬN
                                            </span>
                                            <span style={{ color: '#2D1A12', fontWeight: 600 }}>
                                                {formatDisplayDateTime(activeInspectionItem.inspected_at || activeInspectionItem.created_at)}
                                            </span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                TRẠNG THÁI XÁC NHẬN
                                            </span>
                                            <div>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#059669',
                                                    border: '1px solid #A7F3D0'
                                                }}>
                                                    <CheckCircle2 size={13} /> Đã xác nhận
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                HÀNH ĐỘNG XỬ LÝ
                                            </span>
                                            <div>
                                                {!isInspectionPass ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '3px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#FEF2F2',
                                                        color: '#DC2626',
                                                        border: '1px solid #FECACA'
                                                    }}>
                                                        • Trả hàng
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '3px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#ECFDF5',
                                                        color: '#059669',
                                                        border: '1px solid #A7F3D0'
                                                    }}>
                                                        • Nhập kho
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                SL CẦN KIỂM (LÔ)
                                            </span>
                                            <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                                                {Number(activeInspectionItem.sample_qty || activeInspectionItem.required_qty || 1).toLocaleString()}
                                            </strong>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                SL ĐẠT
                                            </span>
                                            <strong style={{ color: '#1D4ED8', fontSize: '0.92rem' }}>
                                                {Number(isInspectionPass ? (activeInspectionItem.sample_qty || 1) : Math.max((activeInspectionItem.sample_qty || 1) - (activeInspectionItem.error_qty || 0), 0)).toLocaleString()}
                                            </strong>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                                SỐ LỖI PHÁT HIỆN
                                            </span>
                                            <strong style={{
                                                color: Number(activeInspectionItem.error_qty || 0) > 0 ? '#DC2626' : '#059669',
                                                fontSize: '0.92rem'
                                            }}>
                                                {Number(activeInspectionItem.error_qty || 0).toLocaleString()}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* THÔNG TIN XỬ LÝ / BIỆN PHÁP KHẮC PHỤC */}
                                    <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                                        <div style={{
                                            fontSize: '0.76rem',
                                            color: '#7B5233',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px',
                                            marginBottom: '6px'
                                        }}>
                                            THÔNG TIN XỬ LÝ / BIỆN PHÁP KHẮC PHỤC
                                        </div>
                                        <div style={{
                                            background: '#FFFFFF',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #EADCC9',
                                            color: '#2D1A12',
                                            fontSize: '0.86rem',
                                            lineHeight: '1.45'
                                        }}>
                                            {!isInspectionPass
                                                ? 'Lô hàng không đạt tiêu chuẩn kỹ thuật: Yêu cầu trả hàng / xử lý lại hoặc loại bỏ theo quy định QC.'
                                                : 'Sản phẩm đạt yêu cầu kiểm tra: Chấp nhận nhập kho và lưu trữ hồ sơ theo quy trình chuẩn.'}
                                        </div>
                                    </div>

                                    {/* GHI CHÚ KIỂM TRA */}
                                    <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                                        <div style={{ fontSize: '0.76rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                                            GHI CHÚ KIỂM TRA
                                        </div>
                                        <div style={{
                                            background: '#FAF6F0',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #EADCC9',
                                            color: activeInspectionItem.note ? '#2D1A12' : '#9CA3AF',
                                            fontStyle: activeInspectionItem.note ? 'normal' : 'italic',
                                            lineHeight: 1.4,
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {activeInspectionItem.note || 'Chưa ghi nhận thêm ghi chú cho phiếu này.'}
                                        </div>
                                    </div>

                                    {/* HÌNH ẢNH MINH CHỨNG */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{
                                            fontSize: '0.76rem',
                                            color: '#7B5233',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <Camera size={14} />
                                            <span>HÌNH ẢNH MINH CHỨNG ({reportImagesList.length})</span>
                                        </div>
                                        {reportImagesList.length > 0 ? (
                                            renderImageGallery(reportImagesList)
                                        ) : (
                                            <div style={{
                                                padding: '12px 14px',
                                                backgroundColor: '#FAF6F0',
                                                borderRadius: '8px',
                                                border: '1px dashed #EADCC9',
                                                color: '#9CA3AF',
                                                fontSize: '0.82rem',
                                                fontStyle: 'italic'
                                            }}>
                                                Chưa đính kèm hình ảnh minh chứng cho phiếu này.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {inspectionModalData.modalTab === 'details' && (
                                <>
                                    {/* TAB CHI TIẾT (Khớp 100% Tab Chi Tiết) */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{
                                            fontSize: '0.82rem',
                                            color: '#7B5233',
                                            fontWeight: 800,
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px'
                                        }}>
                                            <Package size={15} color="#7B5233" />
                                            <span>DANH SÁCH CHI TIẾT / PHÔI KIỂM TRA ({reportPartsList.length})</span>
                                        </div>

                                        <div style={{
                                            border: '1.5px solid #EADCC9',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            backgroundColor: '#ffffff',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9' }}>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '46px' }}>STT</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '130px' }}>TÊN CHI TIẾT / PHÔI</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '140px' }}>QUY CÁCH / THÔNG SỐ</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '180px' }}>TÊN TỦ (SKU)</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '90px' }}>SL KẾ HOẠCH</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportPartsList.map((p, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx < reportPartsList.length - 1 ? '1px solid #F3EBE1' : 'none' }}>
                                                            <td style={{ padding: '9px 10px', color: '#8D6E63', fontWeight: 700, textAlign: 'center' }}>
                                                                {p.stt}
                                                            </td>
                                                            <td style={{ padding: '9px 12px', color: '#2D1A12', fontWeight: 700 }}>
                                                                {p.name}
                                                            </td>
                                                            <td style={{ padding: '9px 12px' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    backgroundColor: '#FAF6F0',
                                                                    color: '#7B5233',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #EADCC9',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {p.spec}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '9px 12px' }}>
                                                                <span style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    fontSize: '0.76rem',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '5px',
                                                                    backgroundColor: '#EFF6FF',
                                                                    color: '#1D4ED8',
                                                                    fontWeight: 600,
                                                                    border: '1px solid #BFDBFE'
                                                                }}>
                                                                    {p.cabinet}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#4B5563' }}>
                                                                {Number(p.qty).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* BẢNG LỖI HOẶC BANNER HOÀN HẢO */}
                                    {reportErrorsList.length > 0 ? (
                                        <div style={{ marginTop: '16px' }}>
                                            <div style={{
                                                fontSize: '0.82rem',
                                                color: '#991B1B',
                                                fontWeight: 800,
                                                marginBottom: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                textTransform: 'uppercase'
                                            }}>
                                                <AlertTriangle size={15} color="#DC2626" />
                                                <span>DANH SÁCH LỖI PHÁT HIỆN ({reportErrorsList.length})</span>
                                            </div>

                                            <div style={{
                                                border: '1.5px solid #FECDD3',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                backgroundColor: '#ffffff'
                                            }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#FFF5F5', borderBottom: '1.5px solid #FECDD3' }}>
                                                            <th style={{ padding: '10px 8px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '56px' }}>STT</th>
                                                            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem' }}>TÊN LỖI GHI NHẬN</th>
                                                            <th style={{ padding: '10px 12px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '115px' }}>SL LỖI</th>
                                                            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem' }}>GHI CHÚ CHI TIẾT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {reportErrorsList.map((err, idx) => (
                                                            <tr key={idx} style={{ borderBottom: idx < reportErrorsList.length - 1 ? '1px solid #FEE2E2' : 'none' }}>
                                                                <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: '#FEE2E2',
                                                                        color: '#DC2626',
                                                                        fontWeight: 800,
                                                                        fontSize: '0.75rem',
                                                                        border: '1px solid #FECDD3'
                                                                    }}>
                                                                        {err.stt}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '9px 14px', color: '#1E293B', fontWeight: 700 }}>
                                                                    {err.name}
                                                                </td>
                                                                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        display: 'inline-block',
                                                                        padding: '3px 10px',
                                                                        borderRadius: '9999px',
                                                                        backgroundColor: '#FEE2E2',
                                                                        color: '#DC2626',
                                                                        fontWeight: 800,
                                                                        fontSize: '0.78rem',
                                                                        border: '1px solid #FCA5A5'
                                                                    }}>
                                                                        {err.qty}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '9px 14px', color: '#64748B', fontSize: '0.82rem' }}>
                                                                    {err.note}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '14px 16px',
                                            backgroundColor: '#ECFDF5',
                                            borderRadius: '10px',
                                            border: '1.5px solid #A7F3D0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            color: '#065F46'
                                        }}>
                                            <CheckCircle2 size={20} color="#10B981" />
                                            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                                                Không ghi nhận lỗi nào trong quá trình kiểm tra. Sản phẩm / lô hàng đạt chuẩn kỹ thuật.
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {inspectionModalData.modalTab === 'history' && (
                                <div style={{ padding: '4px 0 16px 0' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '18px',
                                        paddingBottom: '12px',
                                        borderBottom: '1px solid #EADCC9'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FAF6F0',
                                                border: '1px solid #EADCC9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <History size={16} color="#7B5233" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12' }}>
                                                    Nhật ký chỉnh sửa & kiểm tra (Audit Trail)
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>
                                                    Lịch sử theo dõi các lần thay đổi thông tin của phiếu
                                                </div>
                                            </div>
                                        </div>

                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '3px 10px',
                                            borderRadius: '9999px',
                                            backgroundColor: '#FAF6F0',
                                            color: '#7B5233',
                                            border: '1px solid #EADCC9',
                                            fontWeight: 600
                                        }}>
                                            {reportHistoryList.length} lần cập nhật
                                        </span>
                                    </div>

                                    {reportHistoryList.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '48px 24px',
                                            backgroundColor: '#FAF6F0',
                                            borderRadius: '12px',
                                            border: '1px dashed #EADCC9',
                                            color: '#8D6E63'
                                        }}>
                                            <Clock size={36} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.4 }} />
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#7B5233' }}>
                                                Chưa có lịch sử chỉnh sửa
                                            </div>
                                            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                                                Mọi chỉnh sửa về kết quả, công đoạn, hành động, hình ảnh hoặc trạng thái khi lưu sẽ được tự động ghi nhận tại đây.
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                bottom: '24px',
                                                left: '11px',
                                                width: '2px',
                                                backgroundColor: '#EADCC9'
                                            }} />

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {reportHistoryList.map((item, idx) => {
                                                    const isConfirm = item.action_type === 'confirm';
                                                    const isCancel = item.action_type === 'cancel';
                                                    const badgeColor = isConfirm ? '#059669' : (isCancel ? '#DC2626' : '#7B5233');
                                                    const badgeBg = isConfirm ? '#ECFDF5' : (isCancel ? '#FEF2F2' : '#FAF6F0');
                                                    const badgeBorder = isConfirm ? '#A7F3D0' : (isCancel ? '#FECDD3' : '#EADCC9');

                                                    let formattedTime = item.timestamp || '';
                                                    let relativeTime = '';
                                                    try {
                                                        if (item.timestamp) {
                                                            const dateObj = new Date(item.timestamp);
                                                            const day = String(dateObj.getDate()).padStart(2, '0');
                                                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                                            const year = dateObj.getFullYear();
                                                            const hours = String(dateObj.getHours()).padStart(2, '0');
                                                            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                                                            formattedTime = `${hours}:${minutes} ${day}/${month}/${year}`;

                                                            const diffMs = Date.now() - dateObj.getTime();
                                                            const diffMins = Math.floor(diffMs / 60000);
                                                            if (diffMins < 1) relativeTime = 'Vừa xong';
                                                            else if (diffMins < 60) relativeTime = `${diffMins} phút trước`;
                                                            else {
                                                                const diffHours = Math.floor(diffMins / 60);
                                                                if (diffHours < 24) relativeTime = `${diffHours} giờ trước`;
                                                                else {
                                                                    const diffDays = Math.floor(diffHours / 24);
                                                                    relativeTime = `${diffDays} ngày trước`;
                                                                }
                                                            }
                                                        }
                                                    } catch (e) {}

                                                    return (
                                                        <div key={item.id || idx} style={{ position: 'relative' }}>
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: '-24px',
                                                                top: '12px',
                                                                transform: 'translate(-50%, 0)',
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                backgroundColor: badgeBg,
                                                                border: `2px solid ${badgeColor}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                                                zIndex: 2
                                                            }}>
                                                                {isConfirm ? (
                                                                    <CheckCircle2 size={12} color="#059669" />
                                                                ) : isCancel ? (
                                                                    <XCircle size={12} color="#DC2626" />
                                                                ) : (
                                                                    <Edit size={11} color="#7B5233" />
                                                                )}
                                                            </div>

                                                            <div style={{
                                                                backgroundColor: '#FFFFFF',
                                                                border: '1px solid #EADCC9',
                                                                borderRadius: '12px',
                                                                padding: '14px 16px',
                                                                boxShadow: '0 1px 4px rgba(123,82,51,0.04)'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    flexWrap: 'wrap',
                                                                    gap: '8px',
                                                                    marginBottom: '10px'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                        <span style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            fontWeight: 700,
                                                                            color: '#2D1A12',
                                                                            fontSize: '0.86rem'
                                                                        }}>
                                                                            <User size={14} color="#7B5233" />
                                                                            {item.user_name || 'QC Administrator'}
                                                                        </span>

                                                                        {item.user_role && (
                                                                            <span style={{
                                                                                fontSize: '0.72rem',
                                                                                padding: '1px 6px',
                                                                                borderRadius: '4px',
                                                                                backgroundColor: '#FAF6F0',
                                                                                color: '#7B5233',
                                                                                border: '1px solid #EADCC9',
                                                                                fontWeight: 600
                                                                            }}>
                                                                                {item.user_role}
                                                                            </span>
                                                                        )}

                                                                        <span style={{
                                                                            fontSize: '0.76rem',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            backgroundColor: badgeBg,
                                                                            color: badgeColor,
                                                                            border: `1px solid ${badgeBorder}`,
                                                                            fontWeight: 700
                                                                        }}>
                                                                            {item.action_label || (isConfirm ? 'Xác nhận duyệt' : isCancel ? 'Hủy hồ sơ' : 'Chỉnh sửa')}
                                                                        </span>
                                                                    </div>

                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '8px',
                                                                        fontSize: '0.76rem',
                                                                        color: '#8D6E63'
                                                                    }}>
                                                                        {relativeTime && (
                                                                            <span style={{
                                                                                backgroundColor: '#FAF6F0',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid #EADCC9',
                                                                                fontWeight: 600
                                                                            }}>
                                                                                {relativeTime}
                                                                            </span>
                                                                        )}
                                                                        <span>{formattedTime}</span>
                                                                    </div>
                                                                </div>

                                                                {Array.isArray(item.changes) && item.changes.length > 0 ? (
                                                                    <div style={{
                                                                        backgroundColor: '#FAF6F0',
                                                                        border: '1px solid #EADCC9',
                                                                        borderRadius: '8px',
                                                                        padding: '8px 12px',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '6px'
                                                                    }}>
                                                                        {item.changes.map((ch, cIdx) => (
                                                                            <div key={cIdx} style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                fontSize: '0.8rem',
                                                                                lineHeight: 1.4,
                                                                                flexWrap: 'wrap'
                                                                            }}>
                                                                                <span style={{
                                                                                    fontWeight: 700,
                                                                                    color: '#7B5233',
                                                                                    minWidth: '130px'
                                                                                }}>
                                                                                    {ch.label || ch.field}:
                                                                                </span>

                                                                                <span style={{
                                                                                    color: '#991B1B',
                                                                                    backgroundColor: '#FEE2E2',
                                                                                    border: '1px solid #FECDD3',
                                                                                    padding: '1px 7px',
                                                                                    borderRadius: '5px',
                                                                                    fontSize: '0.76rem',
                                                                                    textDecoration: 'line-through',
                                                                                    fontWeight: 500
                                                                                }}>
                                                                                    {ch.old_val || '(Trống)'}
                                                                                </span>

                                                                                <ArrowRight size={12} color="#8D6E63" style={{ flexShrink: 0 }} />

                                                                                <span style={{
                                                                                    color: '#065F46',
                                                                                    backgroundColor: '#D1FAE5',
                                                                                    border: '1px solid #A7F3D0',
                                                                                    padding: '1px 7px',
                                                                                    borderRadius: '5px',
                                                                                    fontSize: '0.76rem',
                                                                                    fontWeight: 700
                                                                                }}>
                                                                                    {ch.new_val}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontSize: '0.78rem', color: '#8D6E63', fontStyle: 'italic' }}>
                                                                        {isConfirm ? 'Đã xác nhận đạt và hoàn tất hồ sơ kiểm tra.' : (item.note || 'Không có ghi chú thay đổi chi tiết.')}
                                                                    </div>
                                                                )}

                                                                {item.note && item.changes && item.changes.length > 0 && (
                                                                    <div style={{
                                                                        marginTop: '8px',
                                                                        fontSize: '0.76rem',
                                                                        color: '#7B5233',
                                                                        backgroundColor: '#FFFFFF',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        border: '1px dashed #EADCC9'
                                                                    }}>
                                                                        <strong>Ghi chú:</strong> {item.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. MODAL FOOTER (Khớp 100% Ảnh 2: Xuất Excel, In/PDF, Đóng Esc) */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            padding: '14px 22px',
                            backgroundColor: '#FAF6F0',
                            borderTop: '1.5px solid #EADCC9'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => handleExportSingleInspectionExcel(activeInspectionItem)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #A7F3D0',
                                        backgroundColor: '#ECFDF5',
                                        color: '#047857',
                                        fontWeight: 700,
                                        fontSize: '0.84rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Xuất phiếu này ra file Excel"
                                >
                                    <FileSpreadsheet size={15} />
                                    <span>Xuất Excel</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrintSingleInspection}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #BAE6FD',
                                        backgroundColor: '#F0F9FF',
                                        color: '#0369A1',
                                        fontWeight: 700,
                                        fontSize: '0.84rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="In hoặc lưu PDF phiếu này"
                                >
                                    <Printer size={15} />
                                    <span>In / PDF</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCloseInspectionDetail}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #EADCC9',
                                        backgroundColor: '#FFFFFF',
                                        color: '#8D6E63',
                                        fontWeight: 700,
                                        fontSize: '0.84rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Đóng Esc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ========================================================================= */}
            {/* INDIVIDUAL HANDOVER DETAIL MODAL */}
            {/* ========================================================================= */}
            {isHandoverModalOpen && selectedHandoverItem && ReactDOM.createPortal(
                <div className="modal-overlay" onClick={() => setIsHandoverModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, color: '#2D1A12', fontSize: '1.1rem' }}>
                                Chi Tiết Hồ Sơ Bàn Giao Luân Chuyển
                            </h3>
                            <button onClick={() => setIsHandoverModalOpen(false)} style={{ border: 'none', background: '#FAF6F0', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                                <X size={18} color="#7B5233" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Thời gian</div>
                                <div className="detail-value">{formatDate(selectedHandoverItem.created_at)} {formatTime(selectedHandoverItem.created_at)}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Linh kiện / SP</div>
                                <div className="detail-value" style={{ color: '#7B5233', fontWeight: '800' }}>{selectedHandoverItem.part_name || selectedHandoverItem.product_name}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Công đoạn giao</div>
                                <div className="detail-value">{selectedHandoverItem.delivery_stage}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Công đoạn nhận</div>
                                <div className="detail-value">{selectedHandoverItem.receiving_stage}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Số lượng bàn giao</div>
                                <div className="detail-value" style={{ fontSize: '1.1rem', color: '#7B5233', fontWeight: '800' }}>{selectedHandoverItem.quantity_total} chiếc</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Người giao</div>
                                <div className="detail-value">{selectedHandoverItem.sx_delivery_name}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Người nhận</div>
                                <div className="detail-value">{selectedHandoverItem.sx_receipt_name || '---'}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Trạng thái</div>
                                <div className="detail-value">
                                    <span style={{ 
                                        padding: '3px 10px', 
                                        borderRadius: '12px', 
                                        fontWeight: '800',
                                        ...getStatusStyle(selectedHandoverItem.status)
                                    }}>
                                        {selectedHandoverItem.status || 'Chờ'}
                                    </span>
                                </div>
                            </div>
                            {selectedHandoverItem.note && (
                                <div className="detail-row">
                                    <div className="detail-label">Ghi chú</div>
                                    <div className="detail-value">{selectedHandoverItem.note}</div>
                                </div>
                            )}
                            {renderImageGallery(selectedHandoverItem.images)}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* LIGHTBOX IMAGE MODAL */}
            {imageModalOpen && selectedImage && ReactDOM.createPortal(
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 9999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isDragging ? 'grabbing' : (imageZoom > 1 ? 'grab' : 'default')
                    }}
                    onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                >
                    <img 
                        src={selectedImage}
                        alt="Zoomed"
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            objectFit: 'contain',
                            transform: `scale(${imageZoom}) translate(${imagePan.x}px, ${imagePan.y}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                        style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(255,255,255,0.2)', color: 'white',
                            border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                            cursor: 'pointer', fontSize: '24px'
                        }}
                    >
                        ×
                    </button>
                </div>,
                document.body
            )}

            {/* EXPORT OPTIONS MODAL */}
            {showExportModal && ReactDOM.createPortal(
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>Lựa chọn xuất Excel PO</h3>
                            <button onClick={() => setShowExportModal(false)} style={{ border: 'none', background: '#FAF6F0', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
                                <X size={18} color="#7B5233" />
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            <div 
                                style={{
                                    border: `1.5px solid ${selectedExportOption === 'all_tabs' ? '#7B5233' : '#EADCC9'}`,
                                    backgroundColor: selectedExportOption === 'all_tabs' ? '#FAF6F0' : '#fff',
                                    borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', gap: '12px'
                                }}
                                onClick={() => setSelectedExportOption('all_tabs')}
                            >
                                <input type="radio" checked={selectedExportOption === 'all_tabs'} readOnly style={{ accentColor: '#7B5233' }} />
                                <div>
                                    <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất đầy đủ hồ sơ (Full Sheets)</div>
                                    <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>Bao gồm: Dashboard Tổng Hợp, Danh Mục Sản Phẩm PO, Lịch Sử Bàn Giao, Tất Cả Phiếu QC, BOM.</div>
                                </div>
                            </div>

                            <div 
                                style={{
                                    border: `1.5px solid ${selectedExportOption === 'current_tab' ? '#7B5233' : '#EADCC9'}`,
                                    backgroundColor: selectedExportOption === 'current_tab' ? '#FAF6F0' : '#fff',
                                    borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', gap: '12px'
                                }}
                                onClick={() => setSelectedExportOption('current_tab')}
                            >
                                <input type="radio" checked={selectedExportOption === 'current_tab'} readOnly style={{ accentColor: '#7B5233' }} />
                                <div>
                                    <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất Tab hiện tại</div>
                                    <div style={{ fontSize: '0.78rem', color: '#8D6E63' }}>Chỉ xuất dữ liệu của Tab đang xem ({activeTab === 'products' ? 'Sản phẩm PO' : 'Dashboard'}).</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    if (selectedExportOption === 'all_tabs') handleExportAllTabs();
                                    else if (selectedExportOption === 'current_tab') handleExportCurrentTab();
                                }}
                                disabled={isExporting}
                                style={{
                                    flex: 1, backgroundColor: '#7B5233', color: 'white', border: 'none',
                                    borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '0.9rem',
                                    cursor: isExporting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isExporting ? 'Đang xuất...' : 'Tải xuống File Excel'}
                            </button>
                            <button 
                                onClick={() => setShowExportModal(false)}
                                style={{ backgroundColor: '#FAF6F0', color: '#7B5233', border: '1px solid #EADCC9', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QualityRecordsDetailView;
