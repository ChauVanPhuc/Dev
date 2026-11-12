import { useState, useEffect, useMemo } from 'react';
import warehouseDataService from '../services/warehouseData.service';

/**
 * Shared hook tải danh mục nền trực tiếp từ SQL Server (`/api/v1/warehouses/meta`):
 * warehouses, units, departments (+ stages), defect_categories, customers (+ orders + PO suppliers),
 * accounts, receipt_types, issue_types.
 */
export const useWarehouseMeta = () => {
  const [meta, setMeta] = useState({
    warehouses: [],
    units: [],
    departments: [],
    stages: [],
    defect_categories: [],
    customers: [],
    orders: [],
    accounts: [],
    receipt_types: [],
    issue_types: [],
  });
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let cancelled = false;
    warehouseDataService
      .getWarehouseMeta()
      .then((data) => {
        if (!cancelled && data) {
          setMeta((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => {
        console.error('[useWarehouseMeta] Không thể nạp danh mục nền từ DB:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const warehouses = Array.isArray(meta.warehouses) ? meta.warehouses : [];
    const warehouseNames = warehouses.map((w) => w.name).filter(Boolean);
    const warehouseTabs = [
      { code: 'ALL', name: 'Tất cả', desc: 'Toàn bộ các kho lưu trữ trong nhà máy' },
      ...warehouses.map((w) => ({
        code: w.code,
        name: w.name,
        desc: w.description || '',
      })),
    ];

    const departmentNames = (Array.isArray(meta.departments) ? meta.departments : [])
      .map((d) => d.name)
      .filter(Boolean);

    const defectCategoryNames = (Array.isArray(meta.defect_categories) ? meta.defect_categories : [])
      .map((dc) => dc.name)
      .filter(Boolean);

    const customers = Array.isArray(meta.customers) ? meta.customers : [];
    const accountNames = (Array.isArray(meta.accounts) ? meta.accounts : [])
      .map((a) => a.full_name || a.username)
      .filter(Boolean);

    return {
      meta,
      loadingMeta,
      warehouses,
      warehouseNames,
      warehouseTabs,
      units: Array.isArray(meta.units) ? meta.units : [],
      departmentNames,
      defectCategoryNames,
      customers,
      accountNames,
      orders: Array.isArray(meta.orders) ? meta.orders : [],
      receiptTypes: Array.isArray(meta.receipt_types) ? meta.receipt_types : [],
      issueTypes: Array.isArray(meta.issue_types) ? meta.issue_types : [],
    };
  }, [meta, loadingMeta]);
};

export default useWarehouseMeta;

