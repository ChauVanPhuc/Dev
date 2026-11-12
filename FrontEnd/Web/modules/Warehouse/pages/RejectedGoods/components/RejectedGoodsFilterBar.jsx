import React from 'react';
import { RotateCcw } from 'lucide-react';
import { WAREHOUSE_TABS } from '../../../types/warehouseInventory.types';
import {
  REJECTED_SOURCE_TYPES,
  REJECTED_STATUSES,
  REJECTED_RESOLUTIONS,
  DEFECT_CATEGORIES
} from '../../../types/rejectedGoods.types';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';

export const RejectedGoodsFilterBar = ({
  warehouse = '',
  setWarehouse,
  sourceType = '',
  setSourceType,
  status = '',
  setStatus,
  resolution = '',
  setResolution,
  defectCategory = '',
  setDefectCategory,
  fromDate = '',
  setFromDate,
  toDate = '',
  setToDate,
  onReset
}) => {
  const { warehouseTabs, defectCategoryNames } = useWarehouseMeta();
  const activeWhTabs = warehouseTabs.length > 1 ? warehouseTabs : WAREHOUSE_TABS;
  const activeDefectCats = defectCategoryNames.length > 0 ? defectCategoryNames : DEFECT_CATEGORIES;

  return (
    <div className="rg-filter-bar">
      {/* 1. Kho hàng */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Kho:</label>
        <select
          className="rg-filter-select"
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
        >
          {activeWhTabs.map((w) => (
            <option key={w.code} value={w.code === 'ALL' ? '' : w.name}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Nguồn phát sinh */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Nguồn:</label>
        <select
          className="rg-filter-select"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
        >
          <option value="">Tất cả nguồn</option>
          <option value="QC_INCOMING">{REJECTED_SOURCE_TYPES.QC_INCOMING.label}</option>
          <option value="PROD_RETURN">{REJECTED_SOURCE_TYPES.PROD_RETURN.label}</option>
        </select>
      </div>

      {/* 3. Trạng thái */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Trạng thái:</label>
        <select
          className="rg-filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.values(REJECTED_STATUSES).map((st) => (
            <option key={st.code} value={st.code}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Hướng xử lý */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Xử lý:</label>
        <select
          className="rg-filter-select"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        >
          <option value="">Tất cả hướng xử lý</option>
          {Object.values(REJECTED_RESOLUTIONS).map((res) => (
            <option key={res.code} value={res.code}>
              {res.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Phân loại lỗi */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Loại lỗi:</label>
        <select
          className="rg-filter-select"
          value={defectCategory}
          onChange={(e) => setDefectCategory(e.target.value)}
        >
          <option value="">Tất cả phân loại lỗi</option>
          {activeDefectCats.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 6. Từ ngày */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Từ:</label>
        <input
          type="date"
          className="rg-filter-date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </div>

      {/* 7. Đến ngày */}
      <div className="rg-filter-item">
        <label className="rg-filter-label">Đến:</label>
        <input
          type="date"
          className="rg-filter-date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {/* Nút đặt lại */}
      <button
        type="button"
        className="rg-filter-reset"
        onClick={onReset}
        title="Đặt lại bộ lọc về mặc định"
      >
        <RotateCcw size={12} />
        <span>Đặt lại</span>
      </button>
    </div>
  );
};

