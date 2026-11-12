import React from 'react';
import { Eye, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatNumber } from '../../../types/goodsReceipt.types';
import { ChannelBadge } from '../../../components/WarehouseMobileSyncBadge';
import {
  REJECTED_SOURCE_TYPES,
  REJECTED_STATUSES,
  REJECTED_RESOLUTIONS
} from '../../../types/rejectedGoods.types';

export const RejectedGoodsTable = ({
  items = [],
  loading = false,
  page = 1,
  pageSize = 25,
  onViewDetail,
  onResolve,
  onCancel,
  onOpenOriginVoucher
}) => {
  const getSourceBadge = (sourceType) => {
    if (sourceType === 'QC_INCOMING') {
      return <span className="wh-badge-source-qc">QC đầu vào</span>;
    }
    return <span className="wh-badge-source-prod">Sản xuất trả về</span>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="rg-status-badge pending">Chờ xử lý</span>;
      case 'RESOLVED':
        return <span className="rg-status-badge resolved">Đã xử lý</span>;
      case 'CANCELLED':
        return <span className="rg-status-badge cancelled">Đã hủy</span>;
      default:
        return <span className="rg-status-badge">{status}</span>;
    }
  };

  const getResolutionBadge = (resolution, status) => {
    if (status === 'CANCELLED') {
      return <span className="rg-res-badge" style={{ color: '#9CA3AF' }}>—</span>;
    }
    switch (resolution) {
      case 'REUSE':
        return <span className="rg-res-badge reuse">Tái sử dụng</span>;
      case 'SCRAP':
        return <span className="rg-res-badge scrap">Xuất hủy</span>;
      case 'RETURN_VENDOR':
        return <span className="rg-res-badge return_vendor">Trả NCC</span>;
      case 'PENDING':
      default:
        return <span className="rg-res-badge pending">Chờ thẩm định</span>;
    }
  };

  return (
    <div className="rg-table-container">
      <table className="rg-table">
        <thead>
          <tr>
            <th style={{ width: 45, textAlign: 'center' }}>STT</th>
            <th style={{ width: 130, textAlign: 'left' }}>Mã phiếu</th>
            <th style={{ width: 95, textAlign: 'center' }}>Ngày phát sinh</th>
            <th style={{ width: 125, textAlign: 'center' }}>Nguồn phát sinh</th>
            <th style={{ width: 130, textAlign: 'left' }}>Chứng từ gốc</th>
            <th style={{ width: 140, textAlign: 'left' }}>Kho lưu trữ</th>
            <th style={{ width: 110, textAlign: 'left' }}>Mã vật tư</th>
            <th style={{ textAlign: 'left', minWidth: 180 }}>Tên vật tư</th>
            <th style={{ width: 105, textAlign: 'right' }}>SL Loại (ĐVC)</th>
            <th style={{ width: 105, textAlign: 'right' }}>SL Loại (ĐVCĐ)</th>
            <th style={{ width: 115, textAlign: 'center' }}>Hướng xử lý</th>
            <th style={{ width: 90, textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={12} style={{ textAlign: 'center', padding: '36px 0', color: '#8D6E63' }}>
                Đang nạp danh sách hàng loại &amp; hàng trả về...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={12} style={{ textAlign: 'center', padding: '36px 0', color: '#8D6E63' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={28} color="#D5C3B2" />
                  <span>Không tìm thấy phiếu hàng loại nào phù hợp với bộ lọc hiện tại.</span>
                </div>
              </td>
            </tr>
          ) : (
            items.map((row, idx) => {
              const stt = (page - 1) * pageSize + idx + 1;
              return (
                <tr key={row.id || row.voucher_no}>
                  {/* 1. STT */}
                  <td style={{ textAlign: 'center', color: '#8D6E63' }}>{stt}</td>

                  {/* 2. Mã phiếu */}
                  <td style={{ textAlign: 'left' }}>
                    <button
                      type="button"
                      className="rg-voucher-link"
                      onClick={() => onViewDetail(row)}
                      title="Xem chi tiết phiếu hàng loại"
                    >
                      {row.voucher_no}
                    </button>
                    <ChannelBadge channel={row.created_channel} imageCount={(row.images || []).length} />
                  </td>

                  {/* 3. Ngày phát sinh */}
                  <td style={{ textAlign: 'center' }}>
                    {formatDate(row.created_date)}
                  </td>

                  {/* 4. Nguồn phát sinh */}
                  <td style={{ textAlign: 'center' }}>
                    {getSourceBadge(row.source_type)}
                  </td>

                  {/* 5. Chứng từ gốc */}
                  <td style={{ textAlign: 'left' }}>
                    {row.origin_voucher_no ? (
                      <button
                        type="button"
                        className="rg-voucher-link"
                        onClick={() => onOpenOriginVoucher && onOpenOriginVoucher(row.origin_voucher_no)}
                        title={`Xem chứng từ gốc ${row.origin_voucher_no}`}
                      >
                        {row.origin_voucher_no}
                      </button>
                    ) : (
                      <span style={{ color: '#8D6E63' }}>—</span>
                    )}
                  </td>

                  {/* 6. Kho lưu trữ */}
                  <td style={{ textAlign: 'left', color: '#4B5563' }} title={row.warehouse_name}>
                    {row.warehouse_name}
                  </td>

                  {/* 7. Mã vật tư */}
                  <td style={{ textAlign: 'left', fontWeight: 600, color: '#2D1A12' }}>
                    {row.item_code}
                  </td>

                  {/* 8. Tên vật tư */}
                  <td style={{ textAlign: 'left', color: '#334155' }} title={row.item_name}>
                    {row.item_name}
                  </td>

                  {/* 9. SL Loại (ĐVC) - Số thuần không dấu +/- */}
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#B45309' }}>
                    {formatNumber(row.quantity_main)} <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 400 }}>{row.unit_main}</span>
                  </td>

                  {/* 10. SL Loại (ĐVCĐ) */}
                  <td style={{ textAlign: 'right', color: '#64748B' }}>
                    {row.quantity_conv !== null && row.quantity_conv !== undefined ? (
                      <>
                        {formatNumber(row.quantity_conv)}{' '}
                        <span style={{ fontSize: '0.72rem' }}>{row.unit_conversion || ''}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* 11. Hướng xử lý */}
                  <td style={{ textAlign: 'center' }}>
                    {getResolutionBadge(row.resolution, row.status)}
                  </td>

                  {/* 12. Thao tác */}
                  <td style={{ textAlign: 'center' }}>
                    <div className="rg-action-btn-group">
                      <button
                        type="button"
                        className="rg-action-btn"
                        onClick={() => onViewDetail(row)}
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>

                      {row.status === 'PENDING' && (
                        <button
                          type="button"
                          className="rg-action-btn resolve-btn"
                          onClick={() => onResolve(row)}
                          title="Xử lý thẩm định (Tái sử dụng / Tiêu hủy / Trả NCC)"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}

                      {row.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="rg-action-btn cancel-btn"
                          onClick={() => onCancel(row)}
                          title="Hủy phiếu"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

