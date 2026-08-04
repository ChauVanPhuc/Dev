import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { hrService } from '../../Models/hr.service';

const SelectInfoModal = ({ isOpen, onClose, type, onSelect }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('code');
  const [sortDir, setSortDir] = useState('asc');
  
  // Inline add form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const typeLabels = {
    department: {
      title: 'Danh sách phòng ban',
      searchPlaceholder: 'Nhập Mã, Tên phòng ban...',
      nameLabel: 'Tên phòng ban'
    },
    position: {
      title: 'Danh sách vị trí',
      searchPlaceholder: 'Nhập Mã, Tên vị trí...',
      nameLabel: 'Tên vị trí'
    },
    section: {
      title: 'Danh sách bộ phận',
      searchPlaceholder: 'Nhập Mã, Tên bộ phận...',
      nameLabel: 'Tên bộ phận'
    }
  };

  const label = typeLabels[type] || typeLabels.department;

  const loadData = async () => {
    setLoading(true);
    try {
      let res;
      if (type === 'department') res = await hrService.getDepartments(search);
      else if (type === 'position') res = await hrService.getPositions(search);
      else if (type === 'section') res = await hrService.getSections(search);
      setData(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowAddForm(false);
      setErrorMsg('');
      setNewCode('');
      setNewName('');
      setNewDesc('');
    }
  }, [isOpen, type, search]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCode || !newName) {
      setErrorMsg('Vui lòng điền đầy đủ Mã và Tên.');
      return;
    }
    setErrorMsg('');
    try {
      const payload = { code: newCode, name: newName, description: newDesc };
      if (type === 'department') await hrService.createDepartment(payload);
      else if (type === 'position') await hrService.createPosition(payload);
      else if (type === 'section') await hrService.createSection(payload);
      
      setNewCode('');
      setNewName('');
      setNewDesc('');
      setShowAddForm(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi thêm mới.');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này? Các liên kết nhân sự liên quan sẽ bị xóa hoặc reset.')) return;
    try {
      if (type === 'department') await hrService.deleteDepartment(id);
      else if (type === 'position') await hrService.deletePosition(id);
      else if (type === 'section') await hrService.deleteSection(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa.');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '24px'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12', margin: 0 }}>
            NS03: Chọn Thông tin - {label.title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder={label.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1.5px solid #EADCC9',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Content Table Area */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', minHeight: '240px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#7B5233', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => toggleSort('code')}>
                  Mã <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                  Tên <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th style={{ padding: '10px 12px' }}>Mô tả</th>
                <th style={{ padding: '10px 12px' }}>Ngày tạo</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>Đang tải...</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>Không tìm thấy dữ liệu.</td>
                </tr>
              ) : sortedData.map(item => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item)}
                  style={{
                    borderBottom: '1px solid #F3F4F6',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FDFBF7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#7B5233' }}>{item.code}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', color: '#6B7280' }}>{item.description || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#9CA3AF' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add new inline form */}
        {showAddForm ? (
          <form onSubmit={handleAdd} style={{
            backgroundColor: '#FAF7F2',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            marginBottom: '16px',
            fontSize: '0.85rem'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#7B5233', fontWeight: 700 }}>Thêm mới {type === 'department' ? 'phòng ban' : type === 'position' ? 'vị trí' : 'bộ phận'}</h4>
            {errorMsg && <div style={{ color: '#EF4444', marginBottom: '8px', fontWeight: 600 }}>{errorMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Mã:</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Tên:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Mô tả:</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ padding: '6px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Lưu
              </button>
            </div>
          </form>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7B5233',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0
              }}
            >
              <Plus size={16} /> Thêm mới
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#7B5233',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectInfoModal;
