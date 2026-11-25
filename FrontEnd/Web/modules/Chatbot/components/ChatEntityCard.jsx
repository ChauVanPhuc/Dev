import React from 'react';
import { ExternalLink, Eye } from 'lucide-react';

const ChatEntityCard = ({ item, onNavigateEntity }) => {
  if (!item) return null;

  // Claim card
  if (item.entity_type === 'claim' || item.cabinet_no || item.claim_code) {
    return (
      <div className="chat-item-card">
        <div className="chat-item-header">
          <span>Cabinet #{item.cabinet_no || item.claim_code || 'N/A'}</span>
          <span>{item.period || ''}</span>
        </div>
        <div style={{ marginTop: '2px' }}>
          <strong>SKU:</strong> {item.sku || item.product_name || 'N/A'}
        </div>
        <div>
          <strong>Lỗi:</strong> {item.defect_name || item.defect_code || 'N/A'}
          {item.company_error_code ? ` (G7: ${item.company_error_code})` : ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span>
            <strong>Action:</strong> {item.action || 'N/A'}
          </span>
          <button
            type="button"
            className="chat-item-action-link"
            onClick={() => onNavigateEntity(item)}
            title="Mở chi tiết trên trang Khiếu nại"
          >
            <Eye size={12} /> Xem chi tiết
          </button>
        </div>
      </div>
    );
  }

  // Generic ERP Entity Card (Order/LSX, Warehouse, QC Inspection...)
  return (
    <div className="chat-item-card">
      <div className="chat-item-header">
        <span>{item.title || 'Bản ghi ERP'}</span>
        {item.status && <span className="chat-entity-status">{item.status}</span>}
      </div>
      {item.subtitle && <div style={{ marginTop: '2px', fontWeight: 500 }}>{item.subtitle}</div>}
      {item.meta && <div style={{ fontSize: '0.76rem', color: '#6D4C41', marginTop: '2px' }}>{item.meta}</div>}
      {item.route && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
          <button type="button" className="chat-item-action-link" onClick={() => onNavigateEntity(item)}>
            <ExternalLink size={12} /> Mở màn hình
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatEntityCard;

