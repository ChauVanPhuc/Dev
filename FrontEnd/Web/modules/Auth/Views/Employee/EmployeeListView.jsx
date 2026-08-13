import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Edit2, Trash2, Filter, Upload, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { hrService } from '../../Models/hr.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import EmployeeModal from './EmployeeModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const EmployeeListView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/hr/employees');

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title);
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || '');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Dropdown list states for filtering
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [sections, setSections] = useState([]);

  // Active filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedSec, setSelectedSec] = useState('');
  const [workStatus, setWorkStatus] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      const res = await hrService.getEmployees({
        page,
        size,
        search,
        departmentId: selectedDept ? parseInt(selectedDept) : null,
        positionId: selectedPos ? parseInt(selectedPos) : null,
        sectionId: selectedSec ? parseInt(selectedSec) : null
      });
      setEmployees(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFilters = async () => {
    try {
      const [depts, poss, secs] = await Promise.all([
        hrService.getDepartments(),
        hrService.getPositions(),
        hrService.getSections()
      ]);
      setDepartments(depts || []);
      setPositions(poss || []);
      setSections(secs || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, size, search, selectedDept, selectedPos, selectedSec]);

  useEffect(() => {
    loadFilters();
  }, []);

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ nhân viên này?')) return;
    try {
      await hrService.deleteEmployee(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa nhân viên.');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await hrService.exportEmployees();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Danh_sach_nhan_su.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Lỗi khi xuất file Excel.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await hrService.importEmployees(file);
      alert(res.message || 'Import thành công!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi import file Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const activeFiltersCount = [selectedDept, selectedPos, selectedSec, workStatus].filter(Boolean).length;

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* Page Toolbar component */}
        <PageToolbar
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Nhập mã hoặc tên nhân viên..."
          showFilter={true}
          isFilterOpen={filterOpen}
          onFilterToggle={() => setFilterOpen(!filterOpen)}
          activeFiltersCount={activeFiltersCount}
          importActions={[
            { label: 'Chọn file excel (.xlsx)', icon: <Upload size={16} />, onClick: handleImportClick }
          ]}
          onExport={handleExport}
          onCreate={() => { setSelectedEmployee(null); setModalOpen(true); }}
          createLabel="Thêm mới"
          hasWritePermission={true}
        />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
      />

      {/* Filter Bar Dropdowns */}
      {filterOpen && (
        <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filter-field-group">
            <label className="filter-field-label">Phòng ban</label>
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Vị trí</label>
            <select
              value={selectedPos}
              onChange={(e) => { setSelectedPos(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả vị trí</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Bộ phận</label>
            <select
              value={selectedSec}
              onChange={(e) => { setSelectedSec(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả bộ phận</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Trạng thái làm việc</label>
            <select
              value={workStatus}
              onChange={(e) => { setWorkStatus(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Đang làm việc">Đang làm việc</option>
              <option value="Thử việc">Thử việc</option>
              <option value="Thôi việc">Thôi việc</option>
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Hiển thị số dòng</label>
            <select
              value={size}
              onChange={(e) => { setSize(parseInt(e.target.value)); setPage(1); }}
            >
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          {(selectedDept || selectedPos || selectedSec || workStatus || size !== 15) && (
            <div className="filter-field-group">
              <button
                type="button"
                className="page-btn"
                onClick={() => {
                  setSelectedDept('');
                  setSelectedPos('');
                  setSelectedSec('');
                  setWorkStatus('');
                  setSize(15);
                  setPage(1);
                }}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  fontSize: '0.8rem',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  border: '1px solid #EADCC9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card">
          <div className="table-responsive desktop-only admin-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Phòng ban</th>
                  <th>Vị trí</th>
                  <th>Bộ phận</th>
                  <th>Ngày vào làm</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Không tìm thấy nhân sự nào.</td>
                  </tr>
                ) : employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 700, color: '#7B5233' }}>{emp.employee_id}</td>
                    <td style={{ fontWeight: 600 }}>{emp.full_name}</td>
                    <td>{emp.department_name || '-'}</td>
                    <td>{emp.position_name || '-'}</td>
                    <td>{emp.section_name || '-'}</td>
                    <td>
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(emp)}
                          style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '4px' }}
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phân trang */}
        <div className="admin-pagination-desktop desktop-only">
          <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
            Hiển thị <b>{total > 0 ? (page - 1) * size + 1 : 0} - {Math.min(page * size, total)}</b> trên <b>{total}</b> nhân sự
          </div>
          {pages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="page-btn"
              >
                <ChevronLeft size={14} />
              </button>
              {(() => {
                const pageButtons = [];
                for (let i = 1; i <= pages; i++) {
                  pageButtons.push(
                    <button
                      key={i}
                      className={`page-btn ${page === i ? 'active' : ''}`}
                      onClick={() => setPage(i)}
                    >
                      {i}
                    </button>
                  );
                }
                return pageButtons;
              })()}
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="page-btn"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Employee Modal popup NS05 */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        onSave={loadData}
      />
    </div>
  </div>
  );
};

export default EmployeeListView;
