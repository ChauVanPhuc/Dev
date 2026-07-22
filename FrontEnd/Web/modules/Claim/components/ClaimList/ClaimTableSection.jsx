import React from 'react';
import { Table } from '../Table';
import { Pagination } from '../Pagination';

const ClaimTableSection = ({
  loading,
  claims,
  tableHeaders,
  paginatedClaims,
  highlightBatchId,
  actionMenuId,
  setActionMenuId,
  setActiveDetailClaim,
  setModalMode,
  hasWritePermission,
  selectedClaimIds,
  handleToggleSelectRow,
  startIndex,
  mapCustomerDefectsToG7Name,
  formatPenaltyValue,
  calculateTotalPenalty,
  safeCurrentPage,
  totalPages,
  endIndex,
  totalFilteredItems,
  setCurrentPage
}) => {
  return (
<div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
  <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
    <Table
      loading={loading}
      isEmpty={claims.length === 0}
      emptyMessage="Chưa có dữ liệu khiếu nại nào được nhập."
      headers={tableHeaders}
    >
      {paginatedClaims.map((claim, idx) => (
        <tr 
          key={claim.id} 
          onClick={(e) => {
            if (e.target.closest('.checkbox-col') || e.target.closest('td:last-child') || e.target.closest('.action-btn') || e.target.closest('.action-menu')) {
              return;
            }
            setActiveDetailClaim(claim);
            setModalMode('view');
          }}
          className={`claim-row-clickable ${claim.batch_id && claim.batch_id === highlightBatchId ? 'claim-row-highlight' : ''}`}
          style={{
            position: 'relative',
            zIndex: actionMenuId === claim.id ? 30 : 1,
            cursor: 'pointer'
          }}
        >
          {hasWritePermission && (
            <td className="checkbox-col">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={selectedClaimIds.includes(claim.id)}
                onChange={() => handleToggleSelectRow(claim.id)}
              />
            </td>
          )}
          <td style={{ fontWeight: '600', color: 'var(--text-gray)' }}>{startIndex + idx + 1}</td>
          <td className="code-ref text-left">{claim.claim_code}</td>
          <td className="text-left" style={{ fontWeight: '500', color: '#2D1A12' }}>{claim.product_name}</td>
          <td className="code-error">{claim.order_code}</td>
          <td className="code-error">{mapCustomerDefectsToG7Name(claim.order_code) || claim.company_error_name || ''}</td>
          <td className="value-penalty">{claim.penalty}</td>
          <td className="value-penalty" style={{ fontWeight: '600', color: '#B91C1C' }}>
            {formatPenaltyValue(calculateTotalPenalty(claim))}
          </td>
          <td className="code-lpn">{claim.lpn}</td>
          <td className="code-cont">{claim.cont}</td>
          <td>{claim.date}</td>
          <td>
            <span className={`status-badge badge-${claim.status === 'Mới' ? 'new' : claim.status === 'Đang xem xét' ? 'pending' : 'accepted'}`}>
              {claim.status}
            </span>
          </td>
          {hasWritePermission && (
            <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === claim.id ? 40 : 1 }}>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenuId(actionMenuId === claim.id ? null : claim.id);
                }}
              ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
              {actionMenuId === claim.id && (
                <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button 
                    className="action-menu-item" 
                    onClick={() => {
                      setActionMenuId(null);
                      setActiveDetailClaim(claim);
                      setModalMode('edit');
                    }}
                  >
                    Xử lý khiếu nại
                  </button>
                </div>
              )}
            </td>
          )}
        </tr>
      ))}
    </Table>

    {/* SECTION 5: PAGINATION FOOTER */}
    {!loading && claims.length > 0 && paginatedClaims.length > 0 && (
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={totalFilteredItems}
        onPageChange={(page) => setCurrentPage(page)}
      />
    )}
  </div>
</div>





  );
};

export default ClaimTableSection;
