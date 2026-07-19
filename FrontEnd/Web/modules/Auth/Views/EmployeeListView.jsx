import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, Filter, Upload, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import EmployeeModal from './EmployeeModal';

const EmployeeListView = () => {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
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

  const activeFiltersCount = [selectedDept, selectedPos, selectedSec].filter(Boolean).length;

  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Page Toolbar component */}
      <PageToolbar
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Nhập Mã, Tên màn"
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          backgroundColor: '#FAF7F2',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #EADCC9',
          marginBottom: '16px',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5C3D2E', marginBottom: '6px' }}>Phòng ban</label>
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}
            >
              <option value="">Tất cả</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5C3D2E', marginBottom: '6px' }}>Vị trí</label>
            <select
              value={selectedPos}
              onChange={(e) => { setSelectedPos(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}
            >
              <option value="">Tất cả</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#5C3D2E', marginBottom: '6px' }}>Bộ phận</label>
            <select
              value={selectedSec}
              onChange={(e) => { setSelectedSec(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#fff' }}
            >
              <option value="">Tất cả</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="card" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mã NV</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Họ tên</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phòng ban</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Vị trí</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Bộ phận</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ngày vào làm</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF' }}>Không tìm thấy nhân sự nào.</td>
              </tr>
            ) : employees.map((emp) => (
              <tr
                key={emp.id}
                style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDFBF7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7B5233' }}>{emp.employee_id}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E293B' }}>{emp.full_name}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{emp.department_name || '-'}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{emp.position_name || '-'}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{emp.section_name || '-'}</td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>
                  {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('vi-VN') : '-'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
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

      {/* Pagination Controls */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#6B7280' }}>
          <div>Hiển thị {(page-1)*size+1} - {Math.min(page*size, total)} trên tổng số {total} nhân sự</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 600, color: '#374151' }}>{page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, pages))}
              disabled={page === pages}
              style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Employee Modal popup NS05 */}
      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmployee}
        onSave={loadData}
      />
    </div>
  );
};

export default EmployeeListView;
