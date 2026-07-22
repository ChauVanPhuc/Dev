import React from 'react';

export const MOCK_CABINET_PRICES = [
  { id: 1, cabinet_code: 'A042S-L-BC-WOA', cabinet_name: 'Tủ gỗ Atlas màu sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 100.00, sale_price: 142.49, status: 'Active', last_updated: '2026-06-01T08:00:00Z' },
  { id: 2, cabinet_code: 'A037S-R-BC-WHT', cabinet_name: 'Tủ gỗ Atlas màu trắng bên phải', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 110.00, sale_price: 142.49, status: 'Active', last_updated: '2026-06-02T10:30:00Z' },
  { id: 3, cabinet_code: 'T066D-BC-WOA', cabinet_name: 'Tủ gỗ Table màu sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 150.00, sale_price: 195.00, status: 'Active', last_updated: '2026-05-15T14:20:00Z' },
  { id: 4, cabinet_code: 'T036S-R-BC-GRY', cabinet_name: 'Tủ gỗ Table màu xám bên phải', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 130.00, sale_price: 175.50, status: 'Active', last_updated: '2026-06-03T16:45:00Z' },
  { id: 5, cabinet_code: 'T036S-L-BC-MNB', cabinet_name: 'Tủ gỗ Table màu xanh navy bên trái', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 135.00, sale_price: 175.50, status: 'Active', last_updated: '2026-06-05T11:15:00Z' },
  { id: 6, cabinet_code: 'A049S-BC-WHT', cabinet_name: 'Tủ gỗ Atlas màu trắng', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 90.00, sale_price: 125.00, status: 'Active', last_updated: '2026-04-20T09:00:00Z' },
  { id: 7, cabinet_code: 'T072D-BC-WOA', cabinet_name: 'Tủ gỗ Table lớn sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 180.00, sale_price: 240.00, status: 'Inactive', last_updated: '2026-06-06T15:30:00Z' }
];

export const getColorName = (code) => {
  if (!code) return '';
  return code.slice(-3).toUpperCase();
};

export const renderCabinetThumbnail = (cabinetCode) => {
  if (!cabinetCode) return null;
  const last3 = cabinetCode.slice(-3).toUpperCase();
  let bgColor = '#D7CCC8';
  let iconColor = '#5D4037';
  let label = 'Cabinet';

  if (last3 === 'WHT') {
    bgColor = '#F5F5F5';
    iconColor = '#9E9E9E';
    label = 'Trắng';
  } else if (last3 === 'WOA') {
    bgColor = '#E0C39E';
    iconColor = '#795548';
    label = 'Sồi';
  } else if (last3 === 'GRY') {
    bgColor = '#ECEFF1';
    iconColor = '#607D8B';
    label = 'Xám';
  } else if (last3 === 'MNB') {
    bgColor = '#1A237E';
    iconColor = '#C5CAE9';
    label = 'Xanh Navy';
  } else if (last3 === 'BLK') {
    bgColor = '#212121';
    iconColor = '#B0BEC5';
    label = 'Đen';
  } else if (last3 === 'VGN') {
    bgColor = '#E8F5E9';
    iconColor = '#2E7D32';
    label = 'Xanh Lá';
  } else if (last3 === 'BRO') {
    bgColor = '#D7CCC8';
    iconColor = '#5D4037';
    label = 'Nâu';
  } else if (last3 === 'SAN') {
    bgColor = '#FFF9C4';
    iconColor = '#F57F17';
    label = 'Cát';
  } else if (last3 === 'ESP') {
    bgColor = '#3E2723';
    iconColor = '#D7CCC8';
    label = 'Espresso';
  }

  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
      title={`Màu sắc: ${label}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 12h18" />
        <circle cx="9" cy="7.5" r="1" fill={iconColor} />
        <circle cx="15" cy="7.5" r="1" fill={iconColor} />
        <circle cx="9" cy="16.5" r="1" fill={iconColor} />
        <circle cx="15" cy="16.5" r="1" fill={iconColor} />
      </svg>
    </div>
  );
};

