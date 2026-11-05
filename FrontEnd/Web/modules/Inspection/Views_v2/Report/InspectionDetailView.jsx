import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet, Printer, X, Image as ImageIcon, CheckCircle, CheckCircle2, User, Calendar, Info } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { getInspectionTypeLabel } from './hooks/useInspectionReports';
import '@styles/components.css';

const InspectionDetailView = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  // Cấu hình động mã màn hình, tên màn hình từ Database
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/reports/detail/:type/:id');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [actualType, setActualType] = useState(type);

  // Lấy thông tin tài khoản hiện tại
  const currentUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      let res;
      if (type === 'stage') {
        res = await api.get(`/inspections/stage/${id}`);
        setActualType('stage');
      } else if (type === 'input') {
        try {
          res = await api.get(`/inspections/input/${id}`);
          setActualType('input');
        } catch (err) {
          // Fallback to stage inspection if not found in InputInspection table
          if (err.response?.status === 404 || err.status === 404) {
            res = await api.get(`/inspections/stage/${id}`);
            setActualType('stage');
          } else {
            throw err;
          }
        }
      }
      if (res) {
        setItem(res);
      }
    } catch (error) {
      console.error('Error fetching inspection detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [type, id]);

  const handleConfirm = async () => {
    if (!item) return;
    setConfirming(true);
    try {
      const res = await api.post(`/inspections/confirm/${actualType}/${id}`, {
        confirmed_by: currentUser.id,
        confirmed_by_name: currentUser.full_name || currentUser.name || currentUser.username,
        updated_by: currentUser.full_name || currentUser.name || currentUser.username,
        user_role: currentUser.role_name || currentUser.permission_name || 'Quản lý QC'
      });
      if (res) {
        setItem(prev => ({
          ...prev,
          is_confirmed: true,
          confirmed_at: res.confirmed_at,
          confirmed_by: res.confirmed_by
        }));
        alert("Xác nhận kết quả phiếu kiểm tra thành công!");
      }
    } catch (error) {
      console.error('Error confirming inspection:', error);
      alert("Gặp lỗi khi xác nhận phiếu: " + (error.response?.data?.detail || error.message));
    } finally {
      setConfirming(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const clean = path.replace(/^\/+/, '');
    const { hostname } = window.location;
    const isDev = window.location.port === '1222' || window.location.port === '1333' || window.location.port === '5173' || window.location.port === '3000' || window.location.port === '5174';
    const base = isDev ? `http://${hostname}:1111` : window.location.origin;
    return `${base}/${clean}`;
  };

  // Trích xuất toàn bộ ảnh minh chứng của phiếu kiểm tra công đoạn
  const getStageImages = (stageItem) => {
    if (!stageItem) return [];
    const list = [];
    let parsedData = {};
    try {
      parsedData = typeof stageItem.data_json === 'string' ? JSON.parse(stageItem.data_json || '{}') : (stageItem.data_json || {});
    } catch (e) {}

    if (parsedData.steps) {
      Object.values(parsedData.steps).forEach(st => {
        if (st.photo) list.push(st.photo);
      });
    }
    if (Array.isArray(parsedData.detailsList)) {
      parsedData.detailsList.forEach(det => {
        if (det.image) list.push(det.image);
      });
    }
    if (Array.isArray(parsedData.samples)) {
      parsedData.samples.forEach(s => {
        if (s.moisture?.photo) list.push(s.moisture.photo);
        if (s.size?.photo) list.push(s.size.photo);
      });
    }
    if (Array.isArray(parsedData.checklist_results)) {
      parsedData.checklist_results.forEach(res => {
        if (Array.isArray(res.images)) list.push(...res.images);
        if (Array.isArray(res.steps)) {
          res.steps.forEach(st => {
            if (Array.isArray(st.images)) list.push(...st.images);
          });
        }
      });
    }
    
    // Thêm các ảnh tổng hợp từ images_json
    let generalImages = [];
    try {
      const parsedImages = typeof stageItem.images_json === 'string' ? JSON.parse(stageItem.images_json || '{}') : (stageItem.images_json || {});
      Object.values(parsedImages).forEach(val => {
        if (Array.isArray(val)) generalImages.push(...val);
        else if (typeof val === 'string') generalImages.push(val);
      });
    } catch (e) {}

    const allImages = Array.from(new Set([...list, ...generalImages, stageItem.image_path_1, stageItem.image_path_2, stageItem.image_path_3])).filter(Boolean);
    return allImages;
  };

  // In / Xuất PDF lẻ
  const handlePrintPDF = () => {
    if (!item) return;
    let parsed = {};
    try {
      parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
    } catch (e) {}

    const isDaily = type === 'daily' || item.type === 'daily' || item.is_daily;
    const isInput = type === 'input' || item.type === 'input' || item.inspection_type === 'input' || item.inspection_type === 'dau-vao' || item.inspection_type === 'nhap-kho';
    const typeLabel = isDaily 
      ? 'Ghi nhận lỗi hàng ngày' 
      : (item.category || getInspectionTypeLabel(item.inspection_type));
    const dateVal = isInput ? (item.inspected_at || item.inspection_date) : (item.inspection_date || item.inspected_at || item.created_at);

    const inspectorDisplay = item.inspector_name || parsed.inspector_name || 'QC Thực Hiện';
    const poDisplay = item.batch_no || item.po || item.po_code || item.production_order_code || parsed.batch_no || parsed.po || (isInput ? (item.cont_name || 'N/A') : 'N/A');

    let stageDisplay = item.stage_name || item.stage || parsed.stage_name || parsed.stage || '';
    if (!stageDisplay) {
      if (isInput) stageDisplay = 'Đầu vào / Nhập kho';
      else if (item.inspection_type === 'mau-dau-tien' || item.inspection_type === 'first_sample') stageDisplay = 'Mẫu đầu tiên (FQC)';
      else if (item.inspection_type === 'quy-trinh' || item.inspection_type === 'process') stageDisplay = 'Kiểm tra quy trình';
      else if (item.inspection_type === 'sau-dong-goi' || item.inspection_type === 'oqc') stageDisplay = 'Sau đóng gói (OQC)';
      else if (item.inspection_type === 'do-am') stageDisplay = 'Đo độ ẩm phôi/gỗ';
      else if (item.inspection_type === 'bam-dinh') stageDisplay = 'Thử độ bám dính';
      else if (item.inspection_type === 're_inspect' || item.inspection_type === 'kiem-tra-lai') stageDisplay = 'Tái kiểm tra';
      else stageDisplay = 'Công đoạn sản xuất';
    }

    let productDisplay = item.product_sku || item.part_name || parsed.product_name || parsed.product_sku || parsed.part_name || 'N/A';
    if (item.product_sku && item.part_name && item.product_sku !== item.part_name) {
      productDisplay = `${item.product_sku} - ${item.part_name}`;
    }

    let totalProducts = 0;
    if (isDaily) {
      totalProducts = Number(item.total_products || 0);
    } else {
      totalProducts = Number(
        item.total_products ||
        item.sample_qty ||
        item.required_qty ||
        parsed.sample_qty ||
        parsed.total_products ||
        parsed.requiredQty ||
        (Array.isArray(parsed.detailsList) && parsed.detailsList.length > 0 ? parsed.detailsList.length : null) ||
        (Array.isArray(parsed.samples) && parsed.samples.length > 0 ? parsed.samples.length : null) ||
        1
      );
    }

    const printDefects = typeof extractDefects === 'function' ? extractDefects(item) : (Array.isArray(item.defects) ? item.defects : []);
    let totalDefects = 0;
    if (isDaily) {
      totalDefects = Number(item.total_defects || 0);
    } else {
      totalDefects = Number(
        item.total_defects ??
        item.error_qty ??
        parsed.total_defects ??
        parsed.error_qty ??
        (Array.isArray(printDefects) && printDefects.length > 0 ? printDefects.reduce((acc, d) => acc + (Number(d.quantity) || 1), 0) : null) ??
        (Array.isArray(parsed.detailsList) ? parsed.detailsList.filter(d => d.conclusion === 'fail' || d.conclusion === 'ng' || d.conclusion === 'LỖI').length : null) ??
        (Array.isArray(parsed.samples) ? parsed.samples.filter(s => s.result === 'fail' || s.result === 'ng' || s.result === 'LỖI').length : null) ??
        (item.conclusion === 'fail' || item.result === 'Không đạt' || item.result === 'fail' ? 1 : 0)
      );
    }

    let defectRateDisplay = '0.00%';
    if (typeof item.defect_rate === 'number') {
      defectRateDisplay = item.defect_rate.toFixed(2) + '%';
    } else if (totalProducts > 0) {
      defectRateDisplay = ((totalDefects / totalProducts) * 100).toFixed(2) + '%';
    } else if (totalDefects > 0) {
      defectRateDisplay = '100.00%';
    }

    const isPass = item.conclusion === 'pass' || 
                   item.result === 'Đạt' || 
                   item.result === 'pass' || 
                   item.result === 'ĐẠT' ||
                   (isDaily ? (totalDefects === 0) : true);

    const actionRaw = (typeof itemAction !== 'undefined' ? itemAction : '') || item.action || parsed.action || (!isPass ? 'cach-ly' : 'chap-nhan');
    let actionDisplay = 'Chấp nhận';
    let actionColor = '#15803d';
    let actionBg = '#dcfce7';

    if (actionRaw === 'tra-ve') {
      actionDisplay = 'Trả hàng';
      actionColor = '#dc2626';
      actionBg = '#fee2e2';
    } else if (actionRaw === 'cach-ly' || !isPass) {
      actionDisplay = 'Cách ly / Sửa chữa';
      actionColor = '#b45309';
      actionBg = '#fef3c7';
    }

    let detailsHtml = '';
    const imagesList = typeof getAllTicketImages === 'function' 
      ? getAllTicketImages(item) 
      : (isInput ? [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean) : (typeof getStageImages === 'function' ? getStageImages(item) : []));

    if (isInput) {
      detailsHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Thông số đo kích thước:</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#7B5233; color:#fff;">
              <th style="padding:8px; border:1px solid #ddd;">Chiều dài (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều rộng (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều dày (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_length != null ? item.measured_length : '---'}</td>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_width != null ? item.measured_width : '---'}</td>
              <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.measured_height != null ? item.measured_height : '---'}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      if (parsed.steps) {
        detailsHtml = `
          <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Các bước quy trình kiểm tra:</div>
          <table style="width:100%; border-collapse:collapse; margin-top:8px;">
            <thead>
              <tr style="background:#7B5233; color:#fff;">
                <th style="padding:8px; border:1px solid #ddd;">Hạng mục kiểm tra</th>
                <th style="padding:8px; border:1px solid #ddd;">Giá trị đo được</th>
                <th style="padding:8px; border:1px solid #ddd; text-align:center;">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(parsed.steps).map(([k, val]) => {
                const label = val?.title || val?.name || val?.description || (isNaN(Number(k)) ? k : `Bước ${val?.step_no || Number(k) + 1}`);
                const measurement = val?.standard || val?.content || val?.value || '—';
                const isStepPass = val?.result === 'pass' || val?.result === 'Đạt' || val?.status === 'PASS';
                return `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd;">${label}</td>
                  <td style="padding:8px; border:1px solid #ddd;">${measurement}</td>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${isStepPass ? '#16a34a' : '#dc2626'}">${isStepPass ? 'Đạt' : 'Lỗi'}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        `;
      }
    }

    let defectsPdfHtml = '';
    if (printDefects.length > 0) {
      defectsPdfHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#dc2626; font-size:14px;">DANH SÁCH LỖI / HẠNG MỤC PHÁT HIỆN KHÔNG ĐẠT:</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#fee2e2; color:#991b1b;">
              <th style="padding:8px; border:1px solid #fca5a5; width:40px; text-align:center;">STT</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:left;">Tên loại lỗi / Hạng mục vi phạm</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:center;">Số lượng</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:center;">Mức độ</th>
              <th style="padding:8px; border:1px solid #fca5a5; text-align:left;">Ghi chú / Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            ${printDefects.map((d, i) => `
              <tr>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center; font-weight:bold;">${i + 1}</td>
                <td style="padding:8px; border:1px solid #fca5a5; font-weight:bold; color:#991b1b;">${d.name || d.defect_name || `Lỗi #${d.defect_id || i+1}`}</td>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center; font-weight:bold;">${d.quantity || 1}</td>
                <td style="padding:8px; border:1px solid #fca5a5; text-align:center;"><span style="color:${d.isCTQ || d.isHeavy ? '#dc2626' : '#d97706'}; font-weight:bold;">${d.severity || 'Thường'}</span></td>
                <td style="padding:8px; border:1px solid #fca5a5;">${d.note || item.notes || item.note || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const imagesHtml = imagesList.length > 0 ? `
      <div style="margin-top:20px;">
        <div style="font-weight:bold; color:#7B5233; margin-bottom:10px; font-size:14px;">HÌNH ẢNH MINH CHỨNG:</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${imagesList.map(img => `<img src="${getImageUrl(img)}" style="width:140px; height:100px; object-fit:cover; border-radius:6px; border:1px solid #ddd;" />`).join('')}
        </div>
      </div>
    ` : '';

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Vui lòng cho phép bật cửa sổ popup để in PDF!');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Kiểm Tra QC - #${item.ticket_code || 'DA' + String(item.id).padStart(3, '0')}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7B5233; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #7B5233; text-transform: uppercase; }
          .sub { font-size: 13px; color: #64748b; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; background: #faf6f0; padding: 14px 18px; border-radius: 8px; border: 1px solid #eadcc9; margin-bottom: 20px; }
          .info-item { font-size: 13.5px; display: flex; align-items: center; gap: 8px; }
          .info-item label { color: #78350f; font-weight: bold; white-space: nowrap; min-width: 130px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
          .sig-box { width: 45%; }
          .sig-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
          .confirm-status { margin-top: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #7B5233; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ In / Xuất PDF
          </button>
        </div>
        <div class="header">
          <div>
            <div class="title">G7 SMARTFLOW ERP</div>
            <div class="sub">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG SẢN XUẤT</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: bold; color: #7B5233; text-transform: uppercase;">PHIẾU KIỂM TRA CHẤT LƯỢNG</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Mã phiếu: ${item.ticket_code || 'QC-' + item.id} | Ngày: ${new Date(dateVal).toLocaleDateString('vi-VN')}</div>
            <div style="font-size: 11px; color: #7B5233; font-weight: 700; margin-top: 3px; letter-spacing: 0.5px;">BM: G7.CL.JHKS001-BM01</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item"><label>Loại kiểm tra:</label> <span>${typeLabel}</span></div>
          <div class="info-item"><label>QC Thực Hiện:</label> <span>${inspectorDisplay}</span></div>

          <div class="info-item"><label>Mã PO (Lệnh SX):</label> <span>${poDisplay}</span></div>
          <div class="info-item"><label>Công đoạn:</label> <span>${stageDisplay}</span></div>

          <div class="info-item"><label>Sản phẩm:</label> <span>${productDisplay}</span></div>
          <div class="info-item"><label>Tổng sản phẩm:</label> <span>${totalProducts.toLocaleString()}</span></div>

          <div class="info-item"><label>Tổng lỗi:</label> <span style="font-weight:bold; color:${totalDefects > 0 ? '#dc2626' : '#15803d'}">${totalDefects.toLocaleString()}</span></div>
          <div class="info-item"><label>Tỉ lệ lỗi:</label> <span style="font-weight:bold; color:${totalDefects > 0 ? '#dc2626' : '#15803d'}">${defectRateDisplay}</span></div>

          <div class="info-item"><label>Kết Luận:</label> <span style="font-weight:800; color:${isPass ? '#15803d' : '#dc2626'}; background:${isPass ? '#dcfce7' : '#fee2e2'}; padding:2px 8px; border-radius:4px; border:1px solid ${isPass ? '#bbf7d0' : '#fecaca'}">${isPass ? 'ĐẠT' : 'LỖI'}</span></div>
          <div class="info-item"><label>Hành động xử lý:</label> <span style="font-weight:bold; color:${actionColor}; background:${actionBg}; padding:2px 8px; border-radius:4px;">${actionDisplay}</span></div>

          ${item.specification ? `<div class="info-item"><label>Quy cách:</label> <span>${item.specification}</span></div>` : ''}
          ${item.cont_name && item.cont_name !== poDisplay ? `<div class="info-item"><label>Container:</label> <span>${item.cont_name}</span></div>` : ''}
        </div>

        ${item.is_confirmed ? `
          <div class="confirm-status">
            ✓ ĐÃ XÁC NHẬN KẾT QUẢ KIỂM TRA CHẤT LƯỢNG (Xác nhận lúc: ${new Date(item.confirmed_at).toLocaleString('vi-VN')})
          </div>
        ` : ''}

        ${item.notes || item.note ? `<div style="background:#fffbeb; padding:10px; border-radius:6px; border:1px solid #fef3c7; margin:15px 0; font-size:13px; color:#92400e;"><b>Ghi chú:</b> ${item.notes || item.note}</div>` : ''}

        ${defectsPdfHtml}
        ${detailsHtml}
        ${imagesHtml}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">NGƯỜI LẬP PHIẾU (QC)</div>
            <div style="margin-top: 4px; border: 1.5px dashed #0284c7; background: #f0f9ff; padding: 8px 14px; border-radius: 8px; display: inline-block;">
              <div style="font-weight: 800; color: #0284c7; font-size: 13px; letter-spacing: 0.5px;">✓ ĐÃ KÝ SỐ (QC)</div>
              <div style="font-weight: 700; color: #0369a1; font-size: 12px; margin-top: 2px;">${inspectorDisplay}</div>
              <div style="font-size: 10px; color: #075985; margin-top: 1px;">Thời gian: ${new Date(dateVal).toLocaleString('vi-VN')}</div>
            </div>
          </div>
          <div class="sig-box">
            <div class="sig-title">TRƯỞNG BỘ PHẬN QUẢN LÝ CHẤT LƯỢNG</div>
            ${item.is_confirmed ? `
              <div style="margin-top: 4px; border: 1.5px dashed #059669; background: #f0fdf4; padding: 8px 14px; border-radius: 8px; display: inline-block;">
                <div style="font-weight: 800; color: #059669; font-size: 13px; letter-spacing: 0.5px;">✓ ĐÃ KÝ SỐ & PHÊ DUYỆT</div>
                <div style="font-weight: 700; color: #047857; font-size: 12px; margin-top: 2px;">${item.confirmed_by_name || 'Trưởng Phòng QLCL'}</div>
                <div style="font-size: 10px; color: #065f46; margin-top: 1px;">Thời gian: ${new Date(item.confirmed_at || Date.now()).toLocaleString('vi-VN')}</div>
              </div>
            ` : `
              <div style="font-size: 13px; color: #94a3b8; font-style: italic; margin-top: 12px;">(Chờ ký số & đóng dấu)</div>
            `}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div style={{ padding: '6rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div className="spinner"></div>
          <span style={{ color: '#8D6E63', fontWeight: 600 }}>Đang tải thông tin chi tiết phiếu kiểm tra...</span>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ padding: '6rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
        <h3 style={{ color: '#EF4444' }}>Không tìm thấy phiếu kiểm tra!</h3>
        <button 
          onClick={() => navigate(-1)} 
          style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  const isInput = type === 'input';
  const isPass = isInput ? item.result === 'Đạt' : item.conclusion === 'pass';
  const dateVal = isInput ? item.inspected_at : item.inspection_date;
  const imagesList = isInput ? [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean) : getStageImages(item);

  // Bóc tách dữ liệu chi tiết & quy cách cho trường hợp nhiều chi tiết / bán thành phẩm
  let parsedData = {};
  try {
    parsedData = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
  } catch (e) {}

  let inspectedPartsList = [];
  if (Array.isArray(parsedData.parts_details) && parsedData.parts_details.length > 0) {
    inspectedPartsList = parsedData.parts_details.map(p => ({
      name: p.part_name || p.name || '',
      spec: p.specification || p.spec || '',
      qty: p.plan_qty || p.qty || ''
    }));
  } else if (Array.isArray(parsedData.parts_with_specs) && parsedData.parts_with_specs.length > 0) {
    inspectedPartsList = parsedData.parts_with_specs.map(p => ({
      name: p.part_name || p.name || '',
      spec: p.specification || p.spec || '',
      qty: p.plan_qty || p.qty || ''
    }));
  } else if (Array.isArray(item.parts_details) && item.parts_details.length > 0) {
    inspectedPartsList = item.parts_details.map(p => ({
      name: p.part_name || p.name || '',
      spec: p.specification || p.spec || '',
      qty: p.plan_qty || p.qty || ''
    }));
  } else {
    const rawProd = (item.product_sku || item.part_name || parsedData.product || '').trim();
    const rawSpec = (item.specification || parsedData.spec || '').trim();
    if (rawProd) {
      const prodItems = rawProd.split(/,\s*(?=[^,]+)/).map(s => s.trim()).filter(Boolean);
      const specItems = rawSpec ? rawSpec.split(/,\s*(?=[^,]+)/).map(s => s.trim()).filter(Boolean) : [];
      inspectedPartsList = prodItems.map((prodName, idx) => {
        let assignedSpec = specItems[idx] || (specItems.length === 1 ? specItems[0] : '');
        const dimMatch = prodName.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*[*xX×]\s*\d+(?:[.,]\d+)?)?(?:\s*mm|\s*cm)?)/i);
        let cleanName = prodName;
        if (dimMatch) {
          if (!assignedSpec || assignedSpec === 'Tiêu chuẩn' || assignedSpec === '—') {
            assignedSpec = dimMatch[1].replace(/\s*/g, '');
          }
          cleanName = prodName.replace(dimMatch[0], '').replace(/\s*[-–—:]\s*$/, '').replace(/\s*,\s*$/, '').trim() || prodName;
        }
        return { name: cleanName, spec: assignedSpec, qty: '' };
      });
    }
  }
  inspectedPartsList = inspectedPartsList.filter(p => p.name || p.spec);
  const hasMultipleParts = inspectedPartsList.length > 1;

  return (
    <div className="quality-records-container" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      
      {/* FLOATING ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9', boxShadow: '0 4px 15px rgba(123, 82, 51, 0.05)', flexWrap: 'wrap', gap: '12px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #EADCC9', background: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: '#7B5233', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <ChevronLeft size={18} /> Quay lại
        </button>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handlePrintPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0284C7', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <Printer size={16} /> In PDF
          </button>
          
          {/* NÚT XÁC NHẬN PHIẾU */}
          {!item.is_confirmed ? (
            <button 
              onClick={handleConfirm}
              disabled={confirming}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: '#7B5233', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: confirming ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)' }}
            >
              <CheckCircle size={16} /> {confirming ? "Đang xác nhận..." : "Xác nhận kết quả"}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> Đã xác nhận
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION METADATA IF CONFIRMED */}
      {item.is_confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', color: '#065F46' }}>
          <Info size={18} />
          <div>
            Hồ sơ kiểm tra này đã được <strong>Xác nhận hợp lệ</strong> vào lúc <strong>{new Date(item.confirmed_at).toLocaleString('vi-VN')}</strong>.
          </div>
        </div>
      )}

      {/* MAIN CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* CARD 1: GENERAL INFORMATION */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px' }}>
            Thông tin chung phiếu kiểm tra
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Loại kiểm tra:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>{isInput ? 'Kiểm tra đầu vào (IQC)' : getInspectionTypeLabel(item.inspection_type)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>QC thực hiện:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#8D6E63' }} />
                  {item.inspector_name || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Ngày thực hiện:</span>
                <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#8D6E63' }} />
                  {new Date(dateVal).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isInput ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tên chi tiết / Linh kiện:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {hasMultipleParts ? (
                        <span style={{
                          backgroundColor: '#F3E9DD',
                          color: '#7B5233',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          border: '1px solid #EADCC9',
                          whiteSpace: 'nowrap'
                        }}>
                          {inspectedPartsList.length} chi tiết
                        </span>
                      ) : (
                        item.part_name || 'N/A'
                      )}
                    </span>
                  </div>
                  {!hasMultipleParts && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                      <span style={{ color: '#8D6E63', fontWeight: '600' }}>Quy cách:</span>
                      <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.specification || 'N/A'}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Container / PO:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.cont_name || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Mã PO / Batch:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{item.batch_no || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Mã sản phẩm / Công đoạn:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                      {hasMultipleParts ? (
                        <span style={{
                          backgroundColor: '#F3E9DD',
                          color: '#7B5233',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          border: '1px solid #EADCC9',
                          whiteSpace: 'nowrap'
                        }}>
                          {inspectedPartsList.length} chi tiết
                        </span>
                      ) : (
                        item.product_sku || 'N/A'
                      )}
                    </span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #FAF6F0', paddingBottom: '8px' }}>
                <span style={{ color: '#8D6E63', fontWeight: '600' }}>Kết luận chung:</span>
                <span style={{
                  backgroundColor: isPass ? '#ECFDF5' : '#FEF2F2',
                  color: isPass ? '#10B981' : '#EF4444',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.8rem',
                  border: isPass ? '1px solid #A7F3D0' : '1px solid #FCA5A5'
                }}>
                  {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>
            </div>
          </div>

          {/* BẢNG CHI TIẾT & QUY CÁCH (Hiển thị khi có từ 2 chi tiết trở lên hoặc có danh sách chi tiết) */}
          {hasMultipleParts && (
            <div style={{
              marginTop: '20px',
              backgroundColor: '#FAF6F0',
              borderRadius: '10px',
              border: '1.5px solid #EADCC9',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#F3E9DD',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '800', color: '#7B5233' }}>
                  <span>📋 Danh sách chi tiết & Quy cách kiểm tra</span>
                  <span style={{
                    backgroundColor: '#7B5233',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    {inspectedPartsList.length} chi tiết
                  </span>
                </div>
              </div>
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                overflowX: 'auto',
                borderTop: '1px solid #EADCC9'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#FDFBF7' }}>
                    <tr style={{ backgroundColor: '#FDFBF7', borderBottom: '1px solid #EADCC9', textAlign: 'left', color: '#8D6E63' }}>
                      <th style={{ padding: '8px 12px', width: '45px', textAlign: 'center', backgroundColor: '#FDFBF7' }}>#</th>
                      <th style={{ padding: '8px 12px', fontWeight: '700', backgroundColor: '#FDFBF7' }}>Tên chi tiết / Bán thành phẩm</th>
                      <th style={{ padding: '8px 12px', fontWeight: '700', width: '220px', backgroundColor: '#FDFBF7' }}>Quy cách (Dày x Rộng x Dài)</th>
                      {inspectedPartsList.some(p => p.qty) && (
                        <th style={{ padding: '8px 12px', fontWeight: '700', width: '90px', textAlign: 'center', backgroundColor: '#FDFBF7' }}>Số lượng</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedPartsList.map((part, pIdx) => (
                      <tr key={pIdx} style={{
                        borderBottom: pIdx < inspectedPartsList.length - 1 ? '1px solid #F0E6D8' : 'none',
                        backgroundColor: pIdx % 2 === 0 ? '#FFFFFF' : '#FAF6F0'
                      }}>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#A89F91' }}>
                          {pIdx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2D1A12' }}>
                          {part.name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {part.spec ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              border: '1px solid #FDE68A'
                            }}>
                              {part.spec}
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Theo tiêu chuẩn</span>
                          )}
                        </td>
                        {inspectedPartsList.some(p => p.qty) && (
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#7B5233' }}>
                            {part.qty || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Notes */}
          {(item.notes || item.note) && (
            <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginTop: '16px' }}>
              <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú kiểm tra:</strong>
              <span style={{ color: '#2D1A12' }}>{item.notes || item.note}</span>
            </div>
          )}
        </div>

        {/* CARD 2: MEASUREMENTS OR DETAILED RESULTS */}
        <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px' }}>
            {isInput ? "Kết quả đo kích thước chi tiết (mm)" : "Chi tiết các hạng mục kiểm tra"}
          </h3>
          
          {isInput ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀI</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_length != null ? `${item.measured_length} mm` : '---'}</div>
              </div>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU RỘNG</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_width != null ? `${item.measured_width} mm` : '---'}</div>
              </div>
              <div style={{ background: '#FAF6F0', padding: '14px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀY</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_height != null ? `${item.measured_height} mm` : '---'}</div>
              </div>
            </div>
          ) : (
            (() => {
              let parsed = {};
              try {
                parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
              } catch (e) {}

              if (parsed.steps) {
                return (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Hạng mục kiểm tra</th>
                          <th>Giá trị đo được</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(parsed.steps).map(([k, val]) => (
                          <tr key={k}>
                            <td style={{ fontWeight: '600' }}>{k}</td>
                            <td>{val.value || 'N/A'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${val.result === 'pass' ? 'pass' : 'fail'}`}>
                                {val.result === 'pass' ? 'Đạt' : 'Lỗi'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              
              if (Array.isArray(parsed.samples)) {
                return (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Mẫu kiểm tra</th>
                          <th>Kết quả đo độ ẩm / kích thước</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Kết luận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.samples.map((s, idx) => {
                          const mVal = s.moisture?.values ? s.moisture.values.map(v => `${v}%`).join(', ') : '';
                          const szVal = s.size?.thickness ? `${s.size.thickness}x${s.size.width}x${s.size.length}mm` : '';
                          const samplePass = s.result === 'pass';
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: '700' }}>Mẫu #{s.stt || idx + 1}</td>
                              <td>
                                {mVal && <div>Độ ẩm: <strong>{mVal}</strong></div>}
                                {szVal && <div>Kích thước: <strong>{szVal}</strong></div>}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${samplePass ? 'pass' : 'fail'}`}>
                                  {samplePass ? 'Đạt' : 'Lỗi'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Không có thêm chi tiết thông số.</p>;
            })()
          )}
        </div>

        {/* CARD 3: EVIDENCE GALLERY */}
        {imagesList.length > 0 && (
          <div className="card" style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#7B5233', margin: '0 0 16px 0', borderBottom: '2px solid #FAF6F0', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={18} /> Thư viện hình ảnh minh chứng ({imagesList.length} ảnh)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {imagesList.map((img, index) => (
                <div 
                  key={index}
                  style={{
                    aspectRatio: '4/3',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #EADCC9',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setLightboxImage(img)}
                >
                  <img 
                    src={getImageUrl(img)} 
                    alt="Evidence" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIGHTBOX / FULL IMAGE PREVIEW */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyCenter: 'center', cursor: 'zoom-out' }}
        >
          <img 
            src={getImageUrl(lightboxImage)} 
            alt="Full Preview"
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', objectFit: 'contain', margin: 'auto' }}
          />
          <button 
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} />
          </button>
        </div>
      )}

    </div>
  );
};

export default InspectionDetailView;
