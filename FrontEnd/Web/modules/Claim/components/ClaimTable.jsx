import React from 'react';
import { Table } from './Table';
import { Pagination } from './Pagination';
import { formatPenaltyValue, calculateTotalPenalty } from '../utils/claimHelpers';

export const ClaimTable = ({
  claims = [],
  totalFilteredCount = 0,
  currentPage = 1,
  totalPages = 1,
  rowsPerPage = 30,
  onPageChange,
  loading = false,
  hasWritePermission = true,
  selectedClaimIds = [],
  highlightBatchId = null,
  actionMenuClaimId = null,
  setActionMenuClaimId,
  cabinetPrices = [],
  onToggleSelectAll,
  onToggleSelectRow,
  onOpenClaimDetail,
  onProcessClaim,
  onDeleteClaim
}) => {
  const tableHeaders = [
    ...(hasWritePermission ? [{
      isCheckbox: true,
      label: (
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={claims.length > 0 && claims.every(c => Array.isArray(selectedClaimIds) && selectedClaimIds.includes(c.id))}
          onChange={() => onToggleSelectAll && onToggleSelectAll(claims.map(c => c.id))}
        />
      )
    }] : []),
    { label: 'STT', style: { width: '60px', textAlign: 'center' } },
    { label: 'MÃ THAM CHIẾU', className: 'text-left' },
    { label: 'TÊN SẢN PHẨM', className: 'text-left' },
    { label: 'MÃ LỖI KH' },
    { label: 'TÊN LỖI G7' },
    { label: 'GIÁ TRỊ PHẠT' },
    { label: 'TỔNG TIỀN PHẠT' },
    { label: 'LPN' },
    { label: 'CONTAINER' },
    { label: 'THỜI GIAN CLAIM' },
    { label: 'TRẠNG THÁI' },
    ...(hasWritePermission ? [{ label: 'THAO TÁC', style: { textAlign: 'center', width: '90px' } }] : [])
  ];

  return (
    <div 
      className="admin-table-card" 
      style={{ 
        backgroundColor: '#FFF', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', 
        border: '1px solid #EADCC9',
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        minHeight: 0,
        width: '100%',
        margin: 0
      }}
    >
      {/* 1. Header + 2. Body via Table component */}
      <Table
        loading={loading}
        isEmpty={claims.length === 0}
        emptyMessage="Chưa có dữ liệu khiếu nại nào được nhập."
        headers={tableHeaders}
      >
        {claims.map((claim, idx) => (
          <tr 
            key={claim.id} 
            onClick={(e) => {
              if (e.target.closest('.checkbox-col') || e.target.closest('td:last-child') || e.target.closest('.action-btn') || e.target.closest('.action-menu')) {
                return;
              }
              if (onOpenClaimDetail) onOpenClaimDetail(claim);
            }}
            className={`claim-row-clickable ${claim.batch_id && claim.batch_id === highlightBatchId ? 'claim-row-highlight' : ''}`}
            style={{
              position: 'relative',
              zIndex: actionMenuClaimId === claim.id ? 30 : 1,
              cursor: 'pointer',
              borderBottom: '1px solid #F3F4F6'
            }}
          >
            {hasWritePermission && (
              <td className="checkbox-col" style={{ padding: '10px 14px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={Array.isArray(selectedClaimIds) && selectedClaimIds.includes(claim.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelectRow && onToggleSelectRow(claim.id);
                  }}
                />
              </td>
            )}
            <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-gray)', textAlign: 'center' }}>
              {(() => {
                const pageIdx = Math.max(1, currentPage || 1) - 1;
                const numRows = (typeof rowsPerPage === 'number' && isFinite(rowsPerPage) && rowsPerPage > 0) ? rowsPerPage : 0;
                const startOffset = pageIdx * numRows;
                return (isFinite(startOffset) ? startOffset : 0) + idx + 1;
              })()}
            </td>
            <td className="code-ref text-left" style={{ padding: '10px 14px' }}>{claim.claim_code}</td>
            <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#2D1A12' }}>{claim.product_name}</td>
            <td className="code-error" style={{ padding: '10px 14px' }}>{claim.order_code}</td>
            <td className="code-error" style={{ padding: '10px 14px' }}>{claim.company_error_name || ''}</td>
            <td className="value-penalty" style={{ padding: '10px 14px' }}>{claim.penalty}</td>
            <td className="value-penalty" style={{ padding: '10px 14px', fontWeight: '600', color: '#B91C1C' }}>
              {formatPenaltyValue(calculateTotalPenalty(claim, undefined, cabinetPrices))}
            </td>
            <td className="code-lpn" style={{ padding: '10px 14px' }}>{claim.lpn}</td>
            <td className="code-cont" style={{ padding: '10px 14px' }}>{claim.cont}</td>
            <td style={{ padding: '10px 14px' }}>{claim.date}</td>
            <td style={{ padding: '10px 14px' }}>
              <span className={`status-badge badge-${claim.status === 'Mới' ? 'new' : claim.status === 'Đang xem xét' ? 'pending' : 'accepted'}`}>
                {claim.status}
              </span>
            </td>
            {hasWritePermission && (
              <td style={{ padding: '10px 14px', position: 'relative', textAlign: 'center', zIndex: actionMenuClaimId === claim.id ? 40 : 1 }}>
                <button
                  type="button"
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuClaimId && setActionMenuClaimId(actionMenuClaimId === claim.id ? null : claim.id);
                  }}
                  title="Thao tác"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                  </svg>
                </button>
                {actionMenuClaimId === claim.id && (
                  <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button 
                      type="button"
                      className="action-menu-item" 
                      onClick={() => {
                        setActionMenuClaimId && setActionMenuClaimId(null);
                        if (onProcessClaim) onProcessClaim(claim);
                      }}
                    >
                      Xử lý khiếu nại
                    </button>
                    <button 
                      type="button"
                      className="action-menu-item" 
                      style={{ color: '#DC2626' }}
                      onClick={() => {
                        setActionMenuClaimId && setActionMenuClaimId(null);
                        if (onDeleteClaim) onDeleteClaim(claim);
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </td>
            )}
          </tr>
        ))}
      </Table>

      {/* 3. Footer Pagination (Pinned at bottom of card) */}
      {(() => {
        const numericRows = (typeof rowsPerPage === 'number' && isFinite(rowsPerPage) && rowsPerPage > 0) ? rowsPerPage : (totalFilteredCount || claims.length || 1);
        const startIndex = (Math.max(1, currentPage || 1) - 1) * numericRows;
        const endIndex = startIndex + claims.length;
        return (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFilteredCount}
            rowsPerPage={numericRows}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={onPageChange}
          />
        );
      })()}
    </div>
  );
};

export default ClaimTable;
