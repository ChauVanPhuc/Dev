import React, { useState, useEffect, useRef } from 'react';

import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

import {

    Calendar,

    User,

    ChevronRight,

    ChevronDown,

    Box,

    Truck,

    CheckCircle2,

    AlertCircle,

    Search,

    ChevronLeft,

    Filter,

    ArrowUpDown,

    Download,

    FileSpreadsheet,

    Plus,

    Clock,

    Star,

    Upload,

    X

} from 'lucide-react';

import {

    BarChart,

    Bar,

    XAxis,

    YAxis,

    CartesianGrid,

    Tooltip,

    Legend,

    ResponsiveContainer,

    LineChart,

    Line

} from 'recharts';

import * as XLSX from 'xlsx';

import { planService } from '@modules/Plan/Models/plan.service';

import { orderService } from '@modules/Order/Models/order.service';

import PriorityManagerModal from '@webShared/Views/components/feedback/PriorityManagerModal';

import '@web/styles/Manufacture/PlanDetail.css';



const PlanDetail = () => {

    const { id } = useParams();

    const navigate = useNavigate();

    const outletContext = useOutletContext() || {};

    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, startGlobalUpload } = outletContext;

    const fileInputRef = useRef(null);

    const [plan, setPlan] = useState(null);

    const [loading, setLoading] = useState(true);

    const [expandedOrders, setExpandedOrders] = useState(new Set());

    const [page, setPage] = useState(0);

    const [limit] = useState(15);

    const [searchTerm, setSearchTerm] = useState('');

    const [totalOrders, setTotalOrders] = useState(0);

    const [showPriorityModal, setShowPriorityModal] = useState(false);

    const [uploadState, setUploadState] = useState({

        isUploading: false,

        file: null,

        preview: null

    });

    const [addOrderModal, setAddOrderModal] = useState({

        isOpen: false,

        isSubmitting: false,

        data: { name: '', description: '' }

    });



    // Mock data cho biểu đồ

    const weeklyData = [

        { name: 'Tuần 1', total: 240, done: 160, delay: 30 },

        { name: 'Tuần 2', total: 250, done: 190, delay: 20 },

        { name: 'Tuần 3', total: 270, done: 210, delay: 40 },

        { name: 'Tuần 4', total: 280, done: 240, delay: 10 },

    ];



    const stageData = [

        { name: 'Định hình', plan: 240, actual: 210 },

        { name: 'Lắp ráp', plan: 250, actual: 200 },

        { name: 'Sơn', plan: 280, actual: 260 },

        { name: 'Đóng gói', plan: 300, actual: 250 },

    ];



    useEffect(() => {

        const fetchDetail = async () => {

            try {

                if (!plan) setLoading(true);

                const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

                setPlan(data);

                setTotalOrders(data.total_orders || 0);



                if (data.name) {

                    setCustomScreenCode('MA2.1');

                    setCustomTitle(`Chi tiết Kế hoạch: ${data.name}`);

                    setCustomSubtitle(

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                            <span className="status-tag success">Đang sản xuất</span>

                        </div>

                    );



                    setHeaderExtra(null);

                }



                if (!plan && data.orders && data.orders.length > 0) {

                    setExpandedOrders(new Set([data.orders[0].id]));

                }

            } catch (error) {

                console.error("Lỗi:", error);

            } finally {

                setLoading(false);

            }

        };

        fetchDetail();

    }, [id, page, limit, searchTerm]);



    const toggleOrder = (orderId) => {

        const newSet = new Set(expandedOrders);

        if (newSet.has(orderId)) newSet.delete(orderId);

        else newSet.add(orderId);

        setExpandedOrders(newSet);

    };



    const handleExportExcel = () => {

        if (!plan || !plan.orders || plan.orders.length === 0) {

            alert("Không có dữ liệu đơn hàng trong kế hoạch để xuất.");

            return;

        }



        const rows = [];



        rows.push([`BÁO CÁO CHI TIẾT KẾ HOẠCH SẢN XUẤT - ${plan.name || ''}`]);

        rows.push([`Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`]);

        rows.push([`Tổng số lệnh sản xuất: ${plan.orders.length} lệnh`]);

        rows.push([]);



        rows.push([

            "STT",

            "Lệnh Sản Xuất",

            "Mã Sản Phẩm (SKU)",

            "Tên Sản Phẩm",

            "Số Lượng Kế Hoạch (SLKH)",

            "Số Lượng Hoàn Thành (SLHT)",

            "Tiến Độ (%)",

            "Trạng Thái",

            "Thời Gian Hoàn Thành"

        ]);



        let index = 1;

        plan.orders.forEach((order) => {

            if (order.products && order.products.length > 0) {

                order.products.forEach((product) => {

                    rows.push([

                        index++,

                        `Lệnh SX #${order.name || ''}`,

                        product.sku || '',

                        product.name || '',

                        product.quantity || 0,

                        product.finished_quantity || 0,

                        `${product.progress || 0}%`,

                        product.progress >= 100 ? 'Hoàn thành' : 'Đang thực hiện',

                        product.finished_time || '---'

                    ]);

                });

            } else {

                rows.push([

                    index++,

                    `Lệnh SX #${order.name || ''}`,

                    '---',

                    '---',

                    0,

                    0,

                    '0%',

                    'Không có sản phẩm',

                    '---'

                ]);

            }

        });



        const worksheet = XLSX.utils.aoa_to_sheet(rows);



        if (!worksheet['!merges']) worksheet['!merges'] = [];

        worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });



        const colWidths = [

            { wch: 8 },   // STT

            { wch: 25 },  // Đơn Hàng

            { wch: 20 },  // Mã Sản Phẩm (SKU)

            { wch: 30 },  // Tên Sản Phẩm

            { wch: 25 },  // Số Lượng Kế Hoạch (SLKH)

            { wch: 25 },  // Số Lượng Hoàn Thành (SLHT)

            { wch: 15 },  // Tiến Độ (%)

            { wch: 18 },  // Trạng Thái

            { wch: 22 }   // Thời Gian Hoàn Thành

        ];

        worksheet['!cols'] = colWidths;



        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Chi Tiết KHSX");



        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');

        XLSX.writeFile(workbook, `ChiTietKeHoach_${(plan.name || 'Detail').replace(/\s+/g, '_')}_${dateStr}.xlsx`);

    };



    const handleExportPDF = () => {

        if (!plan) return;



        const exportDate = new Date().toLocaleString('vi-VN');

        const totalOrders = plan.orders?.length || 0;



        const ordersHTML = (plan.orders || []).map((order, oi) => {

            const rows = (order.products || []).map((p, i) => `

                <tr>

                    <td>${i + 1}</td>

                    <td>${p.sku || '---'}</td>

                    <td>${p.name || '---'}</td>

                    <td style="text-align:center">${(p.quantity || 0).toLocaleString('vi-VN')}</td>

                    <td style="text-align:center">${(p.finished_quantity || 0).toLocaleString('vi-VN')}</td>

                    <td style="text-align:center">${p.progress || 0}%</td>

                    <td style="text-align:center">

                        <span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;

                            background:${p.progress >= 100 ? '#d1fae5' : '#fef3c7'};

                            color:${p.progress >= 100 ? '#065f46' : '#92400e'}">

                            ${p.progress >= 100 ? 'Hoàn thành' : 'Đang thực hiện'}

                        </span>

                    </td>

                    <td>${p.finished_time || '---'}</td>

                </tr>`).join('');



            return `

            <div class="order-section">

                <div class="order-header">

                    <span class="order-title">📋 Lệnh sản xuất #${order.name || oi + 1}</span>

                    <span class="order-progress">${order.order_progress || 0}% hoàn thành</span>

                </div>

                <table>

                    <thead>

                        <tr>

                            <th>STT</th>

                            <th>Mã SKU</th>

                            <th>Tên sản phẩm</th>

                            <th>SLKH</th>

                            <th>SLHT</th>

                            <th>Tiến độ</th>

                            <th>Trạng thái</th>

                            <th>Thời gian HT</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows || '<tr><td colspan="8" style="text-align:center;color:#999">Không có sản phẩm</td></tr>'}

                    </tbody>

                </table>

            </div>`;

        }).join('');



        const html = `

<!DOCTYPE html>

<html lang="vi">

<head>

    <meta charset="UTF-8">

    <title>Báo cáo - ${plan.name || 'Kế hoạch sản xuất'}</title>

    <style>

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1e293b; background: white; padding: 20px 30px; }

        .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #A0301B; padding-bottom: 16px; margin-bottom: 20px; }

        .report-title { font-size: 20px; font-weight: 900; color: #A0301B; letter-spacing: 1px; }

        .report-subtitle { font-size: 13px; font-weight: 700; color: #1e293b; margin-top: 4px; }

        .report-meta { font-size: 11px; color: #64748b; text-align: right; line-height: 1.8; }

        .summary-row { display: flex; gap: 16px; margin-bottom: 24px; }

        .summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }

        .summary-card .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        .summary-card .value { font-size: 22px; font-weight: 900; color: #A0301B; margin-top: 4px; }

        .order-section { margin-bottom: 24px; page-break-inside: avoid; }

        .order-header { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-left: 4px solid #A0301B; padding: 8px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }

        .order-title { font-weight: 800; font-size: 13px; color: #1e293b; }

        .order-progress { font-size: 12px; font-weight: 700; color: #A0301B; }

        table { width: 100%; border-collapse: collapse; font-size: 11px; }

        th { background: #1e293b; color: white; padding: 7px 8px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }

        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }

        tr:nth-child(even) td { background: #f8fafc; }

        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center; }

        @media print {

            body { padding: 10px 20px; }

            .order-section { page-break-inside: avoid; }

            @page { margin: 1.5cm; size: A4 portrait; }

        }

    </style>

</head>

<body>

    <div class="report-header">

        <div>

            <div class="report-title">BÁO CÁO CHI TIẾT KẾ HOẠCH SẢN XUẤT</div>

            <div class="report-subtitle">${plan.name || ''}</div>

        </div>

        <div class="report-meta">

            <div>📅 Ngày xuất: ${exportDate}</div>

            <div>📦 Tổng số lệnh SX: ${totalOrders} lệnh</div>

        </div>

    </div>

    <div class="summary-row">

        <div class="summary-card">

            <div class="label">Tổng lệnh sản xuất</div>

            <div class="value">${totalOrders}</div>

        </div>

        <div class="summary-card">

            <div class="label">Tổng sản phẩm</div>

            <div class="value">${(plan.orders || []).reduce((s, o) => s + (o.products?.length || 0), 0)}</div>

        </div>

        <div class="summary-card">

            <div class="label">Tổng sản lượng KH</div>

            <div class="value">${(plan.orders || []).reduce((s, o) => s + (o.products || []).reduce((ps, p) => ps + (p.quantity || 0), 0), 0).toLocaleString('vi-VN')}</div>

        </div>

        <div class="summary-card">

            <div class="label">Tổng đã hoàn thành</div>

            <div class="value">${(plan.orders || []).reduce((s, o) => s + (o.products || []).reduce((ps, p) => ps + (p.finished_quantity || 0), 0), 0).toLocaleString('vi-VN')}</div>

        </div>

    </div>

    ${ordersHTML}

    <div class="footer">SmartFlow ERP &nbsp;|&nbsp; Báo cáo được tạo tự động lúc ${exportDate}</div>

    <script>window.onload = () => { window.print(); }<\/script>

</body>

</html>`;



        const w = window.open('', '_blank');

        w.document.write(html);

        w.document.close();

    };



    const handleTogglePriority = async (e, orderId, currentPriority) => {

        e.stopPropagation();

        try {

            await orderService.update(orderId, { is_priority: currentPriority ? 0 : 1 });

            // Tải lại dữ liệu để cập nhật thứ tự và giao diện

            const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

            setPlan(data);

        } catch (error) {

            console.error("Lỗi khi cập nhật ưu tiên:", error);

        }

    };



    const handleSwapPriority = async (e, orderId, direction) => {

        e.stopPropagation();

        // Lấy danh sách các đơn ưu tiên theo thứ tự hiện tại

        const priorityOrders = (plan.orders || []).filter(o => o.is_priority === 1);

        const currentIdx = priorityOrders.findIndex(o => o.id === orderId);

        if (currentIdx === -1) return;



        const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;

        if (targetIdx < 0 || targetIdx >= priorityOrders.length) return;



        const targetOrderId = priorityOrders[targetIdx].id;

        try {

            await planService.swapOrderPriority(orderId, targetOrderId);

            // Tải lại để phản ánh thứ tự mới

            const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

            setPlan(data);

        } catch (error) {

            console.error('Lỗi khi swap ưu tiên:', error);

        }

    };



    const handleFileSelect = (e) => {

        const file = e.target.files[0];

        if (file) {

            setUploadState(prev => ({

                ...prev,

                file,

                preview: file.name

            }));

        }

    };



    const handleUploadClick = () => {

        fileInputRef.current?.click();

    };



    const handleUpload = async () => {

        if (!uploadState.file) return;



        setUploadState(prev => ({ ...prev, isUploading: true }));



        try {

            if (startGlobalUpload) {

                await startGlobalUpload(

                    uploadState.file,

                    `/production-plans/${id}/import-orders`,

                    async () => {

                        setUploadState({ isUploading: false, file: null, preview: null });

                        alert('Upload file thành công!');

                        // Refresh data

                        const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

                        setPlan(data);

                        setTotalOrders(data.total_orders || 0);

                    }

                );

            } else {

                // Fallback simulation

                setTimeout(() => {

                    setUploadState({ isUploading: false, file: null, preview: null });

                    alert('Upload file thành công (simulation)!');

                }, 2000);

            }

        } catch (error) {

            setUploadState(prev => ({ ...prev, isUploading: false }));

            alert('Upload file thất bại: ' + error.message);

        }

    };



    const handleAddOrderClick = () => {

        setAddOrderModal(prev => ({ ...prev, isOpen: true }));

    };



    const handleAddOrderSubmit = async (e) => {

        e.preventDefault();

        setAddOrderModal(prev => ({ ...prev, isSubmitting: true }));



        try {

            // Create order via API

            const orderData = {

                plan_id: id,

                name: addOrderModal.data.name,

                description: addOrderModal.data.description

            };



            await orderService.create(orderData);



            setAddOrderModal(prev => ({

                ...prev,

                isOpen: false,

                isSubmitting: false,

                data: { name: '', description: '' }

            }));



            alert('Tạo lệnh sản xuất thành công!');



            // Refresh data

            const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

            setPlan(data);

            setTotalOrders(data.total_orders || 0);

        } catch (error) {

            setAddOrderModal(prev => ({ ...prev, isSubmitting: false }));

            alert('Tạo lệnh sản xuất thất bại: ' + error.message);

        }

    };



    if (loading) return (

        <div className="loading-container">

            <div className="spinner"></div>

            <span>Đang chuẩn bị Dashboard...</span>

        </div>

    );



    if (!plan) return (

        <div className="error-container">

            <AlertCircle size={48} color="#ef4444" />

            <h3>Không tìm thấy kế hoạch</h3>

        </div>

    );



    return (

        <>

        <div className="plan-detail-dashboard">



            {/* Stat Cards - Chuẩn hóa đồng bộ toàn hệ thống */}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>

                {[

                    { label: 'TỔNG SỐ LỆNH SẢN XUẤT', value: `${totalOrders} Lệnh`, bg: '#F5F5F5', color: '#424242' },

                    { label: 'ĐANG SẢN XUẤT', value: '111 Lệnh', bg: '#FFF3E0', color: '#E65100' },

                    { label: 'ĐÃ HOÀN THÀNH', value: '222 Lệnh', bg: '#E8F5E9', color: '#2E7D32' },

                    { label: 'TRỄ TIẾN ĐỘ', value: '3 Lệnh', bg: '#FFEBEE', color: '#C62828' },

                ].map((stat, i) => (

                    <div key={i} style={{

                        background: stat.bg,

                        padding: '16px 15px',

                        borderRadius: '12px',

                        display: 'flex',

                        flexDirection: 'column',

                        alignItems: 'center',

                        justifyContent: 'center',

                        textAlign: 'center',

                        minHeight: '90px',

                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',

                        border: '1px solid rgba(0,0,0,0.05)'

                    }}>

                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '700', color: '#757575', letterSpacing: '0.5px' }}>{stat.label}</p>

                        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.value}</h3>

                    </div>

                ))}

            </div>





            {/* Charts Grid */}

            <div className="charts-grid">

                <div className="chart-item card-shadow">

                    <h3>Số lượng lệnh sản xuất theo KHSX</h3>

                    <div className="chart-container">

                        <ResponsiveContainer width="100%" height={250}>

                            <BarChart data={weeklyData}>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                <XAxis dataKey="name" axisLine={false} tickLine={false} />

                                <YAxis axisLine={false} tickLine={false} />

                                <Tooltip />

                                <Bar dataKey="total" fill="#5D4037" radius={[4, 4, 0, 0]} />

                                <Bar dataKey="done" fill="#7CB342" radius={[4, 4, 0, 0]} />

                                <Bar dataKey="delay" fill="#E57373" radius={[4, 4, 0, 0]} />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                <div className="chart-item card-shadow">

                    <h3>KH vs Thực hiện theo công đoạn</h3>

                    <div className="chart-container">

                        <ResponsiveContainer width="100%" height={250}>

                            <BarChart data={stageData}>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                <XAxis dataKey="name" axisLine={false} tickLine={false} />

                                <YAxis axisLine={false} tickLine={false} />

                                <Tooltip />

                                <Bar dataKey="plan" fill="#5D4037" radius={[4, 4, 0, 0]} />

                                <Bar dataKey="actual" fill="#7CB342" radius={[4, 4, 0, 0]} />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                <div className="chart-item card-shadow">

                    <h3>Sản lượng theo tuần</h3>

                    <div className="chart-container">

                        <ResponsiveContainer width="100%" height={250}>

                            <LineChart data={stageData}>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                <XAxis dataKey="name" axisLine={false} tickLine={false} />

                                <YAxis axisLine={false} tickLine={false} />

                                <Tooltip />

                                <Line type="monotone" dataKey="actual" stroke="#5D4037" strokeWidth={3} dot={{ r: 6, fill: '#5D4037' }} />

                                <Line type="monotone" dataKey="plan" stroke="#FFB74D" strokeDasharray="5 5" strokeWidth={2} />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </div>

            </div>



            {/* Main Content Area */}

            <div className="detail-content">

                <div className="list-toolbar card-shadow">

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>

                        <div className="search-box" style={{ flex: 1, maxWidth: '400px' }}>

                            <Search size={18} />

                            <input

                                type="text"

                                placeholder="Tìm kiếm mã Lệnh, sản phẩm..."

                                value={searchTerm}

                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}

                            />

                        </div>

                        

                        <button className="btn-icon-plain" style={{

                            background: 'white',

                            border: '1px solid #E5E7EB',

                            borderRadius: '10px',

                            width: '42px',

                            height: '42px',

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center',

                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'

                        }}><Filter size={18} color="#64748B" /></button>



                        <button

                            onClick={handleAddOrderClick}

                            style={{

                                background: '#5D4037',

                                border: '1.5px solid #5D4037', borderRadius: '10px',

                                height: '42px', padding: '0 16px',

                                display: 'flex', alignItems: 'center', justifyContent: 'center',

                                gap: '8px', color: '#FFFFFF', fontWeight: '700', fontSize: '13px',

                                cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',

                                whiteSpace: 'nowrap'

                            }}

                        >

                            <Plus size={15} />

                            Thêm lệnh

                        </button>

                    </div>

                    <div className="action-btns">

                        <button onClick={handleUploadClick} className="btn-action"><Upload size={16} /> Nhập Excel</button>

                        <button onClick={handleExportExcel} className="btn-action"><FileSpreadsheet size={16} /> Xuất Excel</button>

                    </div>

                </div>



                {/* Hidden file input */}

                <input

                    type="file"

                    ref={fileInputRef}

                    style={{ display: 'none' }}

                    accept=".xlsx,.xls"

                    onChange={handleFileSelect}

                />



                {/* File Preview Panel */}

                {uploadState.file && (

                    <div style={{

                        background: '#FFFFFF',

                        border: '1px solid #E5E7EB',

                        borderRadius: '12px',

                        padding: '16px',

                        marginBottom: '20px',

                        display: 'flex',

                        alignItems: 'center',

                        gap: '12px',

                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'

                    }}>

                        <div style={{

                            width: 48,

                            height: 48,

                            background: '#F8F9FA',

                            borderRadius: 8,

                            display: 'flex',

                            alignItems: 'center',

                            justifyContent: 'center'

                        }}>

                            <FileSpreadsheet size={24} color="#5D4037" />

                        </div>

                        <div style={{ flex: 1 }}>

                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>

                                {uploadState.preview}

                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>

                                {(uploadState.file.size / 1024).toFixed(2)} KB

                            </div>

                        </div>

                        <button

                            onClick={() => setUploadState({ isUploading: false, file: null, preview: null })}

                            style={{

                                width: 36,

                                height: 36,

                                borderRadius: 8,

                                border: '1px solid #E5E7EB',

                                background: '#FFF5F5',

                                cursor: 'pointer',

                                display: 'flex',

                                alignItems: 'center',

                                justifyContent: 'center',

                                transition: 'all 0.2s'

                            }}

                            onMouseEnter={(e) => e.currentTarget.style.background = '#FFE0E0'}

                            onMouseLeave={(e) => e.currentTarget.style.background = '#FFF5F5'}

                        >

                            <X size={18} color="#C62828" />

                        </button>

                        <button

                            onClick={handleUpload}

                            disabled={uploadState.isUploading}

                            style={{

                                padding: '10px 20px',

                                borderRadius: 8,

                                border: 'none',

                                background: uploadState.isUploading ? '#E0E0E0' : '#5D4037',

                                color: 'white',

                                fontWeight: 600,

                                fontSize: '0.9rem',

                                cursor: uploadState.isUploading ? 'not-allowed' : 'pointer',

                                transition: 'all 0.2s'

                            }}

                        >

                            {uploadState.isUploading ? 'Đang upload...' : 'Upload'}

                        </button>

                    </div>

                )}



                {/* Add Order Modal */}

                {addOrderModal.isOpen && (

                    <div style={{

                        position: 'fixed',

                        top: 0,

                        left: 0,

                        right: 0,

                        bottom: 0,

                        background: 'rgba(0,0,0,0.5)',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        zIndex: 1000

                    }}>

                        <div style={{

                            background: '#FFFFFF',

                            borderRadius: 12,

                            padding: '24px',

                            width: '90%',

                            maxWidth: 500,

                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'

                        }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>

                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>

                                    Tạo Lệnh Sản Xuất Mới

                                </h3>

                                <button

                                    onClick={() => setAddOrderModal(prev => ({ ...prev, isOpen: false }))}

                                    style={{

                                        width: 32,

                                        height: 32,

                                        borderRadius: 6,

                                        border: '1px solid #E5E7EB',

                                        background: '#F8F9FA',

                                        cursor: 'pointer',

                                        display: 'flex',

                                        alignItems: 'center',

                                        justifyContent: 'center'

                                    }}

                                >

                                    <X size={18} color="#64748b" />

                                </button>

                            </div>



                            <form onSubmit={handleAddOrderSubmit}>

                                <div style={{ marginBottom: 16 }}>

                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>

                                        Tên lệnh sản xuất *

                                    </label>

                                    <input

                                        type="text"

                                        value={addOrderModal.data.name}

                                        onChange={(e) => setAddOrderModal(prev => ({

                                            ...prev,

                                            data: { ...prev.data, name: e.target.value }

                                        }))}

                                        required

                                        style={{

                                            width: '100%',

                                            padding: '10px 12px',

                                            border: '1px solid #E5E7EB',

                                            borderRadius: 6,

                                            fontSize: '0.9rem',

                                            outline: 'none'

                                        }}

                                        placeholder="Nhập tên lệnh sản xuất"

                                    />

                                </div>



                                <div style={{ marginBottom: 20 }}>

                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>

                                        Mô tả

                                    </label>

                                    <textarea

                                        value={addOrderModal.data.description}

                                        onChange={(e) => setAddOrderModal(prev => ({

                                            ...prev,

                                            data: { ...prev.data, description: e.target.value }

                                        }))}

                                        rows={3}

                                        style={{

                                            width: '100%',

                                            padding: '10px 12px',

                                            border: '1px solid #E5E7EB',

                                            borderRadius: 6,

                                            fontSize: '0.9rem',

                                            outline: 'none',

                                            resize: 'vertical'

                                        }}

                                        placeholder="Mô tả lệnh sản xuất..."

                                    />

                                </div>



                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>

                                    <button

                                        type="button"

                                        onClick={() => setAddOrderModal(prev => ({ ...prev, isOpen: false }))}

                                        style={{

                                            padding: '10px 20px',

                                            borderRadius: 6,

                                            border: '1px solid #E5E7EB',

                                            background: '#FFFFFF',

                                            color: '#1e293b',

                                            fontWeight: 600,

                                            fontSize: '0.9rem',

                                            cursor: 'pointer',

                                            transition: 'all 0.2s'

                                        }}

                                    >

                                        Hủy

                                    </button>

                                    <button

                                        type="submit"

                                        disabled={addOrderModal.isSubmitting}

                                        style={{

                                            padding: '10px 20px',

                                            borderRadius: 6,

                                            border: 'none',

                                            background: addOrderModal.isSubmitting ? '#E0E0E0' : '#5D4037',

                                            color: 'white',

                                            fontWeight: 600,

                                            fontSize: '0.9rem',

                                            cursor: addOrderModal.isSubmitting ? 'not-allowed' : 'pointer',

                                            transition: 'all 0.2s'

                                        }}

                                    >

                                        {addOrderModal.isSubmitting ? 'Đang tạo...' : 'Tạo lệnh'}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                )}



                <div className="orders-container">

                    {plan.orders?.map((order) => (

                        <div 

                            key={order.id} 

                            className={`order-accordion ${expandedOrders.has(order.id) ? 'active' : ''} ${order.is_priority ? 'priority-order' : ''}`}

                            style={order.is_priority ? { border: '1.5px solid #D7CCC8', background: '#FDFBF9' } : {}}

                        >

                            <div className="accordion-header" onClick={() => toggleOrder(order.id)}>

                                <div className="header-left-info" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>

                                    <div className="box-icon"><Box size={20} /></div>

                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                                        {order.is_priority === 1 && <Star size={18} fill="#A1887F" color="#A1887F" />}

                                        Lệnh sản xuất #{order.name}

                                    </h3>

                                    <div className="header-meta-pills" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '16px' }}>

                                        <div className="date-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#5D4037', background: '#EFEBE9', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>

                                            <Calendar size={13} /> 30-04-2026

                                        </div>

                                        <div className="progress-percent" style={{ fontWeight: '800', color: '#E65100', fontSize: '13px' }}>

                                            {order.order_progress || 0}%

                                        </div>

                                    </div>

                                </div>

                                <div className="header-right-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                                    <button 

                                        onClick={(e) => handleTogglePriority(e, order.id, order.is_priority)}

                                        style={{

                                            background: order.is_priority ? '#EFEBE9' : '#F8F9FA',

                                            color: '#5D4037',

                                            border: '1.5px solid #D7CCC8',

                                            borderRadius: '6px',

                                            padding: '6px 12px',

                                            fontSize: '11px',

                                            fontWeight: '700',

                                            cursor: 'pointer',

                                            display: 'flex',

                                            alignItems: 'center',

                                            gap: '6px',

                                            whiteSpace: 'nowrap',

                                            flexShrink: 0

                                        }}

                                    >

                                        <Star size={14} fill={order.is_priority ? '#5D4037' : 'transparent'} />

                                        {order.is_priority ? 'ƯU TIÊN' : 'ƯU TIÊN'}

                                    </button>

                                    <ChevronDown size={24} className="chevron-icon" />

                                </div>

                            </div>



                            <div className="accordion-body">

                                <div className="order-sub-header">

                                    <div className="sub-title">

                                        <strong>Lệnh sản xuất #{order.name}</strong> - {order.products?.length || 0} sản phẩm

                                    </div>

                                </div>



                                <div className="table-wrapper">

                                    <table className="modern-table">

                                        <thead>

                                            <tr>

                                                <th>STT</th>

                                                <th>MÃ SẢN PHẨM</th>

                                                <th>TÊN SẢN PHẨM</th>

                                                <th className="text-right">SLKH</th>

                                                <th className="text-right">SLHT</th>

                                                <th>TIẾN ĐỘ</th>

                                                <th className="text-center">TRẠNG THÁI</th>

                                                <th>THỜI GIAN</th>

                                                <th>THAO TÁC</th>

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {order.products?.map((product, idx) => (

                                                <tr key={idx}>

                                                    <td>{idx + 1}</td>

                                                    <td className="sku-text">{product.sku}</td>

                                                    <td className="name-text">{product.name}</td>

                                                    <td className="text-right">{product.quantity?.toLocaleString()}</td>

                                                    <td className="text-right">{product.finished_quantity?.toLocaleString()}</td>

                                                    <td>

                                                        <div className="progress-cell">

                                                            <div className="progress-bar-bg">

                                                                <div className="progress-bar-fill" style={{ width: `${Math.min(product.progress || 0, 100)}%` }}></div>

                                                            </div>

                                                            <span>{product.progress || 0}%</span>

                                                        </div>

                                                    </td>

                                                    <td className="text-center">

                                                        <span className={`badge-status ${product.progress >= 100 ? 'success' : 'warning'}`}>

                                                            {product.progress >= 100 ? 'Hoàn thành' : 'Đang thực hiện'}

                                                        </span>

                                                    </td>

                                                    <td>{product.finished_time || '---'}</td>

                                                    <td className="action-cell">

                                                        <span

                                                            onClick={() => navigate(`/manufacture/progress/${product.id}`)}

                                                            style={{ color: '#5D4037', cursor: 'pointer', textDecoration: 'underline' }}

                                                        >

                                                            Chi tiết

                                                        </span>

                                                    </td>

                                                </tr>

                                            ))}

                                        </tbody>

                                    </table>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>



                <div className="pagination-bar card-shadow">

                    <div className="page-info">

                        {Math.min(page * limit + 1, totalOrders)} - {Math.min((page + 1) * limit, totalOrders)} of {totalOrders} Lệnh sản xuất

                    </div>

                    <div className="page-nav">

                        <button className="nav-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>

                            <ChevronLeft size={18} />

                        </button>

                        {Array.from({ length: Math.min(5, Math.ceil(totalOrders / limit)) }, (_, i) => (

                            <button

                                key={i}

                                className={`page-num ${page === i ? 'active' : ''}`}

                                onClick={() => setPage(i)}

                            >

                                {i + 1}

                            </button>

                        ))}

                        <button className="nav-btn" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalOrders / limit) - 1}>

                            <ChevronRight size={18} />

                        </button>

                    </div>

                </div>

            </div>

        </div>



        {/* Modal Quản lý thứ tự ưu tiên */}

        {showPriorityModal && (

            <PriorityManagerModal

                orders={plan?.orders || []}

                onClose={() => setShowPriorityModal(false)}

                onSaved={async () => {

                    const data = await planService.getPlanById(id, page * limit, limit, searchTerm);

                    setPlan(data);

                }}

            />

        )}

        </>

    );

};



export default PlanDetail;

