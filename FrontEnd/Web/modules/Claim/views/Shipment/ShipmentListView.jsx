import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { claimService } from '../../services/claim.service';
import * as XLSX from 'xlsx';
import '../../styles/claim.css';
import '@styles/components.css';

// Import shared components
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { FormModal, AlertModal } from '../../components/Modal';

/**
 * View: Quản lý Xuất Cont (Container Shipment Management)
 */
const ShipmentListView = () => {
  const { setCustomTitle, setCustomSubtitle, showModal: contextShowModal } = useOutletContext();
  const [localNotification, setLocalNotification] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in ShipmentListView:', e);
  }

  const hasWritePermission = loggedInUserIsAdmin || activePermissions['shipments'] !== 'read';


  const showModal = (title, message, type = 'info') => {
    setLocalNotification({ title, message, type });
    if (type === 'success' && typeof message === 'string') {
      setTimeout(() => {
        setLocalNotification(prev => prev && prev.message === message ? null : prev);
      }, 3500);
    }
    if (typeof contextShowModal === 'function') {
      try {
        contextShowModal(title, message, type);
      } catch (err) {
        console.error('Error calling contextShowModal:', err);
      }
    }
  };
  
  const [allShipments, setAllShipments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState(null);
  
  // Advanced Filter states
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'delivery', 'value', or null
  const [filterPort, setFilterPort] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinValue, setFilterMinValue] = useState('');
  const [filterMaxValue, setFilterMaxValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    const newFilters = {};
    if (filterPort) newFilters.port = filterPort;
    if (filterStatus) newFilters.status = filterStatus;
    if (filterMinValue) newFilters.minValue = filterMinValue;
    if (filterMaxValue) newFilters.maxValue = filterMaxValue;
    setAppliedFilters(newFilters);
  }, [filterPort, filterStatus, filterMinValue, filterMaxValue]);

  const clearAllFilters = () => {
    setFilterPort('');
    setFilterStatus('');
    setFilterMinValue('');
    setFilterMaxValue('');
  };

  const removeFilterKey = (key) => {
    if (key === 'port') setFilterPort('');
    else if (key === 'status') setFilterStatus('');
    else if (key === 'minValue') setFilterMinValue('');
    else if (key === 'maxValue') setFilterMaxValue('');
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdown && !e.target.closest('.filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
      setActionMenuId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeDropdown]);

  // Add/Edit shipment modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  
  // Form fields
  const [shipmentCode, setShipmentCode] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [status, setStatus] = useState('Draft');
  const [totalValue, setTotalValue] = useState(0);

  // Dynamic filter values extracted from allShipments
  const uniquePorts = React.useMemo(() => {
    const ports = allShipments.map(item => item.destination_port);
    return [...new Set(ports)].filter(Boolean).sort();
  }, [allShipments]);

  // Page title configuration
  useEffect(() => {
    setCustomTitle('Lịch trình xuất cont');
    setCustomSubtitle('Quản lý xuất cont · Quản lý bốc xếp hàng & xuất khẩu container');
  }, []);

  // Initial fetch and search trigger
  useEffect(() => {
    fetchShipments();
  }, [search]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const response = await claimService.getShipments({
        search: search || undefined
      });
      setAllShipments(response.items || []);
    } catch (error) {
      console.error('Lỗi tải lịch trình xuất cont:', error);
      showModal('Lỗi', 'Không thể tải danh sách xuất cont từ server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reactive filtering logic
  useEffect(() => {
    let filtered = [...allShipments];
    
    if (filterPort) {
      filtered = filtered.filter(item => item.destination_port === filterPort);
    }
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    if (filterMinValue) {
      filtered = filtered.filter(item => item.total_value >= Number(filterMinValue));
    }
    if (filterMaxValue) {
      filtered = filtered.filter(item => item.total_value <= Number(filterMaxValue));
    }
    
    setShipments(filtered);
  }, [allShipments, filterPort, filterStatus, filterMinValue, filterMaxValue]);

  // Sort function
  const getSortedShipments = (shipmentsList) => {
    if (!sortOption) return shipmentsList;
    return [...shipmentsList].sort((a, b) => {
      if (sortOption === 'code-asc') {
        return (a.shipment_code || '').localeCompare(b.shipment_code || '');
      }
      if (sortOption === 'code-desc') {
        return (b.shipment_code || '').localeCompare(a.shipment_code || '');
      }
      if (sortOption === 'value-asc') {
        return a.total_value - b.total_value;
      }
      if (sortOption === 'value-desc') {
        return b.total_value - a.total_value;
      }
      if (sortOption === 'etd-asc') {
        const dateA = a.etd ? new Date(a.etd) : new Date(0);
        const dateB = b.etd ? new Date(b.etd) : new Date(0);
        return dateA - dateB;
      }
      if (sortOption === 'etd-desc') {
        const dateA = a.etd ? new Date(a.etd) : new Date(0);
        const dateB = b.etd ? new Date(b.etd) : new Date(0);
        return dateB - dateA;
      }
      return 0;
    });
  };

  // Pagination config matching PriceListView.jsx
  const rowsPerPage = 13;

  useEffect(() => {
    setCurrentPage(1);
  }, [shipments, search, sortOption, filterPort, filterStatus, filterMinValue, filterMaxValue]);

  const sortedShipments = getSortedShipments(shipments);
  const totalFilteredItems = sortedShipments.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedShipments = sortedShipments.slice(startIndex, endIndex);

  // Selection handlers
  const handleToggleSelectAll = () => {
    const displayedIds = paginatedShipments.map(s => s.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedShipmentIds.includes(id));
    if (allSelected) {
      setSelectedShipmentIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedShipmentIds(prev => {
        const next = [...prev];
        displayedIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id) => {
    if (selectedShipmentIds.includes(id)) {
      setSelectedShipmentIds(prev => prev.filter(rowId => rowId !== id));
    } else {
      setSelectedShipmentIds(prev => [...prev, id]);
    }
  };

  // Generator for shipment code
  const generateShipmentCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    setShipmentCode(`SHP-G7-${random}`);
  };

  // Modal open handlers
  const handleOpenAddModal = () => {
    setEditingShipment(null);
    generateShipmentCode();
    setContainerNumber('');
    setSealNumber('');
    setDestinationPort('Cảng Cát Lái (Hồ Chí Minh)');
    setEtd(new Date().toISOString().substring(0, 10));
    setEta(new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10));
    setStatus('Draft');
    setTotalValue(50000);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingShipment(item);
    setShipmentCode(item.shipment_code || '');
    setContainerNumber(item.container_number || '');
    setSealNumber(item.seal_number || '');
    setDestinationPort(item.destination_port || '');
    setEtd(item.etd ? item.etd.substring(0, 10) : '');
    setEta(item.eta ? item.eta.substring(0, 10) : '');
    setStatus(item.status || 'Draft');
    setTotalValue(item.total_value || 0);
    setIsAddModalOpen(true);
  };

  // Save/Create submit handler
  const handleSaveShipment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!containerNumber || !destinationPort) {
      showModal('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    try {
      const payload = {
        shipment_code: shipmentCode,
        container_number: containerNumber,
        seal_number: sealNumber || null,
        destination_port: destinationPort,
        etd: etd ? new Date(etd).toISOString() : null,
        eta: eta ? new Date(eta).toISOString() : null,
        status: status,
        total_value: Number(totalValue) || 0
      };

      if (editingShipment) {
        await claimService.updateShipment(editingShipment.id, payload);
        showModal('Thành công', `Đã cập nhật thông tin xuất cont ${editingShipment.container_number} thành công!`, 'success');
      } else {
        await claimService.createShipment(payload);
        showModal('Thành công', `Đã tạo lịch trình xuất cont ${containerNumber} mới thành công!`, 'success');
      }
      setIsAddModalOpen(false);
      fetchShipments();
    } catch (error) {
      console.error('Lỗi lưu lịch trình xuất cont:', error);
      showModal('Lỗi', 'Lưu thông tin thất bại. Vui lòng kiểm tra lại.', 'error');
    }
  };

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedShipmentIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedShipmentIds.length} lô xuất cont đã chọn?`)) {
      try {
        setLoading(true);
        // Delete items sequentially or via concurrent requests
        await Promise.all(selectedShipmentIds.map(id => claimService.deleteShipment(id)));
        showModal('Thành công', `Đã xóa thành công ${selectedShipmentIds.length} lô xuất cont.`, 'success');
        setSelectedShipmentIds([]);
        fetchShipments();
      } catch (error) {
        console.error('Lỗi khi xóa nhiều cont:', error);
        showModal('Lỗi', 'Đã xảy ra lỗi trong quá trình xóa dữ liệu.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export Excel handler
  const handleExportExcel = () => {
    if (shipments.length === 0) {
      showModal('Thông báo', 'Không có dữ liệu lịch trình xuất cont để xuất.', 'info');
      return;
    }

    const headers = ['STT', 'Mã lô hàng', 'Số Container', 'Số Seal', 'Cảng đến', 'Ngày đi (ETD)', 'Ngày đến (ETA)', 'Trị giá ($)', 'Trạng thái'];
    const rows = shipments.map((s, idx) => [
      idx + 1,
      s.shipment_code,
      s.container_number,
      s.seal_number || '',
      s.destination_port,
      s.etd ? new Date(s.etd).toLocaleDateString('vi-VN') : '',
      s.eta ? new Date(s.eta).toLocaleDateString('vi-VN') : '',
      formatUSD(s.total_value),
      s.status === 'Draft' ? 'Chuẩn bị' : s.status === 'Loading' ? 'Đang bốc xếp' : s.status === 'Shipped' ? 'Đang đi biển' : 'Đã bàn giao'
    ]);
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = [
      { wch: 6 },   // STT
      { wch: 18 },  // Mã lô hàng
      { wch: 20 },  // Số Container
      { wch: 15 },  // Số Seal
      { wch: 25 },  // Cảng đến
      { wch: 15 },  // Ngày đi (ETD)
      { wch: 15 },  // Ngày đến (ETA)
      { wch: 15 },  // Trị giá ($)
      { wch: 15 }   // Trạng thái
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lịch trình xuất cont");
    XLSX.writeFile(workbook, "Lich_trinh_xuat_cont.xlsx");
  };

  const formatUSD = (val) => {
    if (val === undefined || val === null) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadgeLabel = (statusVal) => {
    switch (statusVal) {
      case 'Draft': return 'Chuẩn bị';
      case 'Loading': return 'Đóng hàng';
      case 'Shipped': return 'Đi biển';
      case 'Delivered': return 'Cập bến';
      default: return statusVal;
    }
  };

  const getStatusBadgeClass = (statusVal) => {
    switch (statusVal) {
      case 'Draft': return 'pending';
      case 'Loading': return 'new';
      case 'Shipped': return 'new';
      case 'Delivered': return 'accepted';
      default: return 'pending';
    }
  };

  const tableHeaders = [
    ...(hasWritePermission ? [{
      isCheckbox: true,
      label: (
        <input 
          type="checkbox" 
          className="checkbox-custom" 
          checked={paginatedShipments.length > 0 && paginatedShipments.every(s => selectedShipmentIds.includes(s.id))}
          onChange={handleToggleSelectAll}
        />
      )
    }] : []),
    { label: 'STT', style: { width: '60px' } },
    { label: 'Container Number', className: 'text-left' },
    { label: 'Status' },
    { label: 'Thời gian' },
    { label: 'Thời gian lưu kho' },
    { label: 'Thời gian xuất bến' },
    ...(hasWritePermission ? [{ label: 'Thao tác', style: { textAlign: 'center' } }] : [])
  ];

  return (
    <div className="claim-container">
      {/* FILTER & ACTIONS BAR */}
      <div className="mgmt-toolbar card" style={{ marginBottom: '20px' }}>
        <div className="toolbar-left" style={{ flex: 1 }}>
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Tìm Cont, Seal, Cảng..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button
            type="button"
            className={`icon-btn-minimal ${isFilterBarOpen ? 'active' : ''}`}
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              border: '1px solid #EADCC9',
              backgroundColor: isFilterBarOpen ? '#7B5233' : '#FAF6F0',
              color: isFilterBarOpen ? '#FFFFFF' : '#7B5233',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '0 16px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            <Filter size={14} />
            Bộ lọc
            {Object.keys(appliedFilters).length > 0 && (
              <span style={{
                backgroundColor: isFilterBarOpen ? '#FFFFFF' : '#7B5233',
                color: isFilterBarOpen ? '#7B5233' : '#FFFFFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                marginLeft: '4px'
              }}>
                {Object.keys(appliedFilters).length}
              </span>
            )}
          </button>

          {/* SORT DROPDOWN */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="select-minimal"
              style={{
                height: '36px',
                borderColor: '#EADCC9',
                color: '#7B5233',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 12px 0 28px',
                cursor: 'pointer',
                backgroundColor: '#FAF6F0',
                outline: 'none',
                fontSize: '0.8rem'
              }}
            >
              <option value="">Sắp xếp</option>
              <option value="code-asc">Mã lô: A-Z</option>
              <option value="code-desc">Mã lô: Z-A</option>
              <option value="value-asc">Trị giá: Thấp-Cao</option>
              <option value="value-desc">Trị giá: Cao-Thấp</option>
              <option value="etd-asc">ETD: Sớm nhất</option>
              <option value="etd-desc">ETD: Trễ nhất</option>
            </select>
            <svg 
              style={{ position: 'absolute', left: '8px', top: '11px', pointerEvents: 'none', color: '#7B5233' }} 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M15 18H3M21 14H3M17 10H3M21 6H3"></path>
            </svg>
          </div>
        </div>

        <div className="toolbar-right">
          {hasWritePermission && (
            <button 
              className="btn btn-primary" 
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: '#7B5233',
                color: '#fff'
              }}
            >
              <Plus size={16} />
              Thêm mới
            </button>
          )}

          <button 
            className="btn btn-outline" 
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: '1px solid #EADCC9',
              backgroundColor: '#fff',
              color: '#7B5233'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Export
          </button>

          {hasWritePermission && (
            <button
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                borderColor: selectedShipmentIds.length === 0 ? '#CBD5E1' : '#A0301B',
                color: selectedShipmentIds.length === 0 ? '#94A3B8' : '#A0301B',
                cursor: selectedShipmentIds.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 16px',
                backgroundColor: '#fff'
              }}
              disabled={selectedShipmentIds.length === 0}
              onClick={handleDeleteSelected}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Xóa đã chọn
            </button>
          )}
        </div>
      </div>

      {/* INLINE EXPANDABLE FILTER BAR */}
      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {/* CATEGORY 1: VẬN CHUYỂN */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'delivery' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'delivery' ? null : 'delivery'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Vận chuyển</span>
              {['port', 'status'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['port', 'status'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'delivery' && (
              <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group">
                  <label className="filter-field-label">Cảng đến</label>
                  <select value={filterPort} onChange={(e) => setFilterPort(e.target.value)}>
                    <option value="">Tất cả cảng</option>
                    {uniquePorts.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Trạng thái vận chuyển</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="Draft">Chuẩn bị (Draft)</option>
                    <option value="Loading">Đóng hàng (Loading)</option>
                    <option value="Shipped">Đi biển (Shipped)</option>
                    <option value="Delivered">Cập bến (Delivered)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 2: TRỊ GIÁ */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'value' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'value' ? null : 'value'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Trị giá</span>
              {['minValue', 'maxValue'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['minValue', 'maxValue'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'value' && (
              <div className="filter-dropdown-card" style={{ width: '320px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group">
                  <label className="filter-field-label">Khoảng trị giá ($)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      placeholder="Từ (Min)" 
                      value={filterMinValue} 
                      onChange={(e) => setFilterMinValue(e.target.value)} 
                      className="filter-dropdown-input"
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#8D6E63', fontWeight: 'bold' }}>-</span>
                    <input 
                      type="number" 
                      placeholder="Đến (Max)" 
                      value={filterMaxValue} 
                      onChange={(e) => setFilterMaxValue(e.target.value)} 
                      className="filter-dropdown-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active applied filter chips container with a border wrapper */}
          {Object.keys(appliedFilters).length > 0 && (
            <div
              className="filter-chips-wrapper"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1.5px dashed #EADCC9',
                borderRadius: '8px',
                padding: '4px 10px',
                backgroundColor: '#FFFFFF',
                minHeight: '34px',
                boxSizing: 'border-box',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63', display: 'flex', alignItems: 'center' }}>Đã chọn:</span>
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                let displayLabel = '';

                if (key === 'port') displayLabel = `Cảng: ${value}`;
                else if (key === 'status') displayLabel = `Trạng thái: ${getStatusBadgeLabel(value)}`;
                else if (key === 'minValue') displayLabel = `Trị giá từ: $${value}`;
                else if (key === 'maxValue') displayLabel = `Trị giá đến: $${value}`;
                else return null;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #EADCC9',
                      height: '24px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{displayLabel}</span>
                    <button
                      type="button"
                      onClick={() => removeFilterKey(key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#A0301B',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontWeight: '900',
                        marginLeft: '2px'
                      }}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reset filter button if any filter is active */}
          {Object.keys(appliedFilters).length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#A0301B',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                textDecoration: 'underline',
                padding: '0 12px',
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <Table
            loading={loading}
            isEmpty={paginatedShipments.length === 0}
            emptyMessage="Không tìm thấy thông tin xuất cont nào."
            headers={tableHeaders}
          >
            {paginatedShipments.map((item, idx) => {
              const getStorageDuration = (s) => {
                if (!s.etd) return '5 ngày';
                const start = new Date(s.created_at || Date.now());
                const end = new Date(s.etd);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return `${diffDays || 5} ngày`;
              };

              return (
                <tr 
                  key={item.id}
                  style={{
                    position: 'relative',
                    zIndex: actionMenuId === item.id ? 30 : 1
                  }}
                >
                  {hasWritePermission && (
                    <td className="checkbox-col">
                      <input 
                        type="checkbox" 
                        className="checkbox-custom" 
                        checked={selectedShipmentIds.includes(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                      />
                    </td>
                  )}
                  <td style={{ fontWeight: '600', color: 'var(--text-gray)' }}>{startIndex + idx + 1}</td>
                  <td className="text-left" style={{ fontWeight: 'bold', color: '#2D1A12' }}>{item.container_number}</td>
                  <td>
                    <span className={`status-badge badge-${getStatusBadgeClass(item.status)}`}>
                      {getStatusBadgeLabel(item.status)}
                    </span>
                  </td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</td>
                  <td style={{ fontWeight: '500', color: '#5D4037' }}>{getStorageDuration(item)}</td>
                  <td style={{ fontWeight: '500', color: '#2D1A12' }}>{item.etd ? new Date(item.etd).toLocaleDateString('vi-VN') : 'N/A'}</td>
                  {hasWritePermission && (
                    <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuId(actionMenuId === item.id ? null : item.id);
                        }}
                      ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                      {actionMenuId === item.id && (
                        <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                          <button 
                            className="action-menu-item" 
                            onClick={() => {
                              setActionMenuId(null);
                              handleOpenEditModal(item);
                            }}
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </Table>

          {/* PAGINATION FOOTER */}
          {!loading && paginatedShipments.length > 0 && (
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

      {/* ADD NEW / EDIT SHIPMENT MODAL */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveShipment}
        title={editingShipment ? "Chỉnh sửa thông tin xuất cont" : "Đăng ký xuất container"}
        width="min(95vw, 680px)"
        cancelLabel="Hủy"
        confirmLabel="Lưu lại"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Row 1: Mã lô & Số Container */}
          <div className="add-claim-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">Mã lô hàng (Tự động)</label>
              <input 
                type="text" 
                value={shipmentCode} 
                readOnly 
                className="add-claim-input"
                style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Số Container *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: MSKU 982145-2" 
                value={containerNumber} 
                onChange={(e) => setContainerNumber(e.target.value)} 
                className="add-claim-input"
                required 
              />
            </div>
          </div>

          {/* Row 2: Số Seal & Cảng nhận */}
          <div className="add-claim-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">Số Seal Hải quan</label>
              <input 
                type="text" 
                placeholder="Ví dụ: G7-98721" 
                value={sealNumber} 
                onChange={(e) => setSealNumber(e.target.value)} 
                className="add-claim-input"
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Cảng đến *</label>
              <input 
                type="text" 
                placeholder="Nhập cảng nhận..." 
                value={destinationPort} 
                onChange={(e) => setDestinationPort(e.target.value)} 
                className="add-claim-input"
                required 
              />
            </div>
          </div>

          {/* Row 3: ETD & ETA */}
          <div className="add-claim-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">Ngày xuất cảng (ETD)</label>
              <input 
                type="date" 
                value={etd} 
                onChange={(e) => setEtd(e.target.value)} 
                className="add-claim-input"
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Ngày dự kiến tới (ETA)</label>
              <input 
                type="date" 
                value={eta} 
                onChange={(e) => setEta(e.target.value)} 
                className="add-claim-input"
              />
            </div>
          </div>

          {/* Row 4: Trị giá & Trạng thái */}
          <div className="add-claim-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="add-claim-field">
              <label className="add-claim-label">Trị giá lô hàng (USD)</label>
              <input 
                type="number" 
                value={totalValue} 
                onChange={(e) => setTotalValue(e.target.value)} 
                className="add-claim-input"
              />
            </div>
            <div className="add-claim-field">
              <label className="add-claim-label">Trạng thái bốc xếp/vận chuyển</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                className="add-claim-select"
                style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 10px' }}
              >
                <option value="Draft">Chuẩn bị (Draft)</option>
                <option value="Loading">Đang đóng hàng (Loading)</option>
                <option value="Shipped">Đang đi biển (Shipped)</option>
                <option value="Delivered">Đã cập bến (Delivered)</option>
              </select>
            </div>
          </div>
        </div>
      </FormModal>

      {/* LOCAL ALERTS/NOTIFICATIONS POPUP */}
      <AlertModal
        isOpen={!!localNotification}
        onClose={() => setLocalNotification(null)}
        title={localNotification?.title || ''}
        message={localNotification?.message || ''}
        type={localNotification?.type || 'info'}
        width="420px"
      />
    </div>
  );
};

export default ShipmentListView;
