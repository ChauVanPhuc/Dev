// useUnitOfMeasure.js - Custom Hook quản lý trạng thái, tìm kiếm, lọc, phân trang và thao tác CRUD cho Đơn vị tính
import { useState, useEffect, useMemo, useCallback } from 'react';
import unitOfMeasureService from '../services/unitOfMeasure.service';

export const useUnitOfMeasure = ({ toast } = {}) => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('id'); // 'id' | 'code' | 'full_name' | 'precision' | 'status'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Load units from Backend API
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unitOfMeasureService.fetchUnits();
      setUnits(data);
    } catch (e) {
      console.error(e);
      if (toast?.error) toast.error('Không thể tải danh sách đơn vị tính!');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUnits();

    // Lắng nghe sự kiện đồng bộ từ các tab khác hoặc thao tác khác
    const handleUpdate = () => fetchUnits();
    window.addEventListener('smartflow_units_updated', handleUpdate);
    return () => window.removeEventListener('smartflow_units_updated', handleUpdate);
  }, [fetchUnits]);

  // Bộ lọc và tìm kiếm
  const filteredUnits = useMemo(() => {
    let result = [...units];

    // Lọc theo từ khóa tìm kiếm (Tên đơn vị tính hoặc tên đầy đủ)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(u => 
        (u.code && u.code.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q))
      );
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'ALL') {
      result = result.filter(u => u.status === statusFilter);
    }

    // Sắp xếp
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      return sortDir === 'asc' 
        ? valA.localeCompare(valB, 'vi', { numeric: true }) 
        : valB.localeCompare(valA, 'vi', { numeric: true });
    });

    return result;
  }, [units, search, statusFilter, sortBy, sortDir]);

  // Phân trang
  const totalCount = filteredUnits.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Điều chỉnh lại page nếu vượt quá totalPages
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedUnits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, page, pageSize]);

  // Số lượng bộ lọc đang áp dụng
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (search.trim()) count++;
    return count;
  }, [statusFilter, search]);

  const resetAllFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
    setActiveDropdown(null);
  }, []);

  // CRUD actions
  const createUnit = async (data) => {
    try {
      const created = await unitOfMeasureService.createUnit(data);
      await fetchUnits();
      if (toast?.success) toast.success(`Đã thêm mới đơn vị tính "${created.code}" thành công!`);
      return created;
    } catch (err) {
      if (toast?.error) toast.error(err.message || 'Không thể tạo đơn vị tính');
      throw err;
    }
  };

  const updateUnit = async (id, data) => {
    try {
      const updated = await unitOfMeasureService.updateUnit(id, data);
      await fetchUnits();
      if (toast?.success) toast.success(`Đã cập nhật đơn vị tính "${updated.code}" thành công!`);
      return updated;
    } catch (err) {
      if (toast?.error) toast.error(err.message || 'Không thể cập nhật đơn vị tính');
      throw err;
    }
  };

  const toggleStatus = async (id) => {
    try {
      const updated = await unitOfMeasureService.toggleStatus(id);
      await fetchUnits();
      const statusText = updated.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động';
      if (toast?.success) toast.success(`Đã chuyển đơn vị tính "${updated.code}" sang "${statusText}"`);
      return updated;
    } catch (err) {
      if (toast?.error) toast.error(err.message || 'Không thể thay đổi trạng thái');
      throw err;
    }
  };

  const deleteUnit = async (id) => {
    try {
      await unitOfMeasureService.deleteUnit(id);
      await fetchUnits();
      if (toast?.success) toast.success('Đã xóa đơn vị tính thành công!');
      return true;
    } catch (err) {
      // Re-throw to handle in modal
      throw err;
    }
  };

  const exportExcel = (mode = 'filtered') => {
    try {
      const dataToExport = mode === 'all' ? units : filteredUnits;
      const fileName = unitOfMeasureService.exportToExcel(dataToExport);
      if (toast?.success) toast.success(`Đã xuất danh sách đơn vị tính ra file ${fileName}!`);
    } catch (err) {
      if (toast?.error) toast.error('Lỗi khi xuất Excel: ' + err.message);
    }
  };

  return {
    units,
    filteredUnits,
    pagedUnits,
    loading,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    activeFiltersCount,
    resetAllFilters,
    activeDropdown,
    setActiveDropdown,
    fetchUnits,
    createUnit,
    updateUnit,
    toggleStatus,
    deleteUnit,
    exportExcel
  };
};

export default useUnitOfMeasure;
