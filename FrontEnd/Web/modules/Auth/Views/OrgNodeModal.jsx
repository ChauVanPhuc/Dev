import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import SelectInfoModal from './SelectInfoModal';

const OrgNodeModal = ({ isOpen, onClose, node, allNodes, onSave }) => {
  const [levelName, setLevelName] = useState('Cấp 1');
  const [parentId, setParentId] = useState('');
  const [note, setNote] = useState('');
  
  // Selection references
  const [dept, setDept] = useState(null);
  const [pos, setPos] = useState(null);
  const [sec, setSec] = useState(null);

  // Selected assignments
  const [occupants, setOccupants] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmpToAssign, setSelectedEmpToAssign] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');

  // Selector modal state
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectType, setSelectType] = useState('department');

  const isEdit = !!node;

  const loadData = async () => {
    try {
      // Load all employees to assign
      const empRes = await hrService.getEmployees({ size: 1000 });
      setAvailableEmployees(empRes.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setAssignmentDate(new Date().toISOString().substring(0, 10));
      setSelectedEmpToAssign('');
      
      if (node) {
        setLevelName(node.level_name || 'Cấp 1');
        setParentId(node.parent_id || '');
        setNote(node.note || '');
        setDept(node.department_id ? { id: node.department_id, name: node.department_name } : null);
        setPos(node.position_id ? { id: node.position_id, name: node.position_name } : null);
        setSec(node.section_id ? { id: node.section_id, name: node.section_name } : null);
        setOccupants(node.occupants || []);
      } else {
        setLevelName('Cấp 1');
        setParentId('');
        setNote('');
        setDept(null);
        setPos(null);
        setSec(null);
        setOccupants([]);
      }
    }
  }, [isOpen, node]);

  const openSelector = (type) => {
    setSelectType(type);
    setSelectModalOpen(true);
  };

  const handleInfoSelect = (item) => {
    if (selectType === 'department') setDept(item);
    else if (selectType === 'position') setPos(item);
    else if (selectType === 'section') setSec(item);
    setSelectModalOpen(false);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedEmpToAssign) return;
    try {
      const payload = {
        node_id: node.id,
        employee_id: parseInt(selectedEmpToAssign),
        assigned_date: assignmentDate
      };
      await hrService.assignEmployee(payload);
      
      // Reload page and occupants
      if (onSave) onSave();
      
      // Manually refresh local occupants list
      const updatedNodes = await hrService.getOrgNodes();
      const thisNode = updatedNodes.find(n => n.id === node.id);
      if (thisNode) {
        setOccupants(thisNode.occupants || []);
      }
      setSelectedEmpToAssign('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi bổ nhiệm nhân viên.');
    }
  };

  const handleUnassign = async (assId) => {
    if (!window.confirm('Bạn có chắc chắn muốn miễn nhiệm nhân sự này khỏi vị trí?')) return;
    try {
      await hrService.unassignEmployee(assId);
      if (onSave) onSave();
      
      // Refresh local occupants list
      const updatedNodes = await hrService.getOrgNodes();
      const thisNode = updatedNodes.find(n => n.id === node.id);
      if (thisNode) {
        setOccupants(thisNode.occupants || []);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi miễn nhiệm nhân viên.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        level_name: levelName,
        parent_id: parentId ? parseInt(parentId) : null,
        department_id: dept?.id || null,
        position_id: pos?.id || null,
        section_id: sec?.id || null,
        note: note || null
      };

      if (isEdit) {
        await hrService.updateOrgNode(node.id, payload);
      } else {
        await hrService.createOrgNode(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi lưu nút sơ đồ tổ chức.');
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '680px',
        maxHeight: '95vh',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12', margin: 0 }}>
            NS02: Thông tin nhân tố
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Cấp hiện tại</label>
              <select
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                <option value="Cấp 1">Cấp 1</option>
                <option value="Cấp 2">Cấp 2</option>
                <option value="Cấp 3">Cấp 3</option>
                <option value="Cấp 4">Cấp 4</option>
                <option value="Cấp 5">Cấp 5</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Cấp trên</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                <option value="">-- Không có (Nút gốc) --</option>
                {allNodes
                  .filter(n => !node || n.id !== node.id) // Prevent self-parenting
                  .map(n => (
                    <option key={n.id} value={n.id}>
                      {n.level_name} - {n.position_name || 'Vị trí trống'} ({n.department_name || 'Không phòng ban'})
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Phòng ban</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  placeholder="Chưa chọn phòng ban"
                  value={dept ? dept.name : ''}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#F9FAFB' }}
                />
                <button
                  type="button"
                  onClick={() => openSelector('department')}
                  style={{ padding: '8px 14px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Chọn
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Vị trí</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  placeholder="Chưa chọn vị trí"
                  value={pos ? pos.name : ''}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#F9FAFB' }}
                />
                <button
                  type="button"
                  onClick={() => openSelector('position')}
                  style={{ padding: '8px 14px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Chọn
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Bộ phận</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  placeholder="Chưa chọn bộ phận"
                  value={sec ? sec.name : ''}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', backgroundColor: '#F9FAFB' }}
                />
                <button
                  type="button"
                  onClick={() => openSelector('section')}
                  style={{ padding: '8px 14px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Chọn
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Ghi chú</label>
              <input
                type="text"
                placeholder="Nhập ghi chú"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Org structure nodes can only assign occupants when editing */}
          {isEdit && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '20px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7B5233', margin: '0 0 12px 0' }}>
                Danh sách nhân sự đương nhiệm
              </h3>

              {/* Assignment Form */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Nhân viên bổ nhiệm</label>
                  <select
                    value={selectedEmpToAssign}
                    onChange={(e) => setSelectedEmpToAssign(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: '#fff' }}
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {availableEmployees.map(e => (
                      <option key={e.id} value={e.id}>{e.employee_id} - {e.full_name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1.2 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>Ngày đảm nhiệm</label>
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAssign}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#7B5233',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}
                >
                  Bổ nhiệm
                </button>
              </div>

              {/* Current Assignments Table */}
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Mã NV</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Họ tên</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Ngày đảm nhiệm</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupants.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '12px', color: '#9CA3AF' }}>Vị trí trống</td>
                      </tr>
                    ) : occupants.map(occ => (
                      <tr key={occ.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#7B5233' }}>{occ.employee_id}</td>
                        <td style={{ padding: '8px 12px' }}>{occ.full_name}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {occ.assigned_date ? new Date(occ.assigned_date).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleUnassign(occ.assignment_id)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                            title="Miễn nhiệm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>

      {/* SelectInfoModal nested lookup */}
      <SelectInfoModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        type={selectType}
        onSelect={handleInfoSelect}
      />
    </div>
  );
};

export default OrgNodeModal;
