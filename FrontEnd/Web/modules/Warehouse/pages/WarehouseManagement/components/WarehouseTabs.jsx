import React from 'react';
import { WAREHOUSE_TABS } from '../../../types/warehouseInventory.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

/**
 * Thanh chọn nhóm kho (lấy trực tiếp từ bảng warehouses trong DB)
 */
export const WarehouseTabs = ({ selectedWarehouse, onSelectWarehouse }) => {
  const { warehouseTabs } = useWarehouseMeta();
  const tabs = warehouseTabs.length > 1 ? warehouseTabs : WAREHOUSE_TABS;

  return (
    <div className="wh-tabs-container">
      {tabs.map((tab) => {
        const isActive = selectedWarehouse === tab.code;

        return (
          <button
            key={tab.code}
            type="button"
            className={`wh-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectWarehouse(tab.code)}
            title={tab.desc}
          >
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default WarehouseTabs;
