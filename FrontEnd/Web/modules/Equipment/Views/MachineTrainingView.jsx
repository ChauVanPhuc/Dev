import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, BookOpen, Eye } from 'lucide-react';
import '@styles/components.css';

const MachineTrainingView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const data = await api.get('/machines/');
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải thông tin tài liệu hướng dẫn máy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCustomScreenCode('MC37.3');
    setCustomTitle('Hướng dẫn sử dụng máy móc');
    setCustomSubtitle('Thư viện quy trình hướng dẫn vận hành chuẩn (SOP) và tài liệu sử dụng máy móc sản xuất an toàn.');
    fetchMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    return machines.filter(m => 
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [machines, searchTerm]);

  // Helper useMemo for filtering to solve React dependency check warning
  function useMemo(fn, deps) {
    return React.useMemo(fn, deps);
  }

  return (
    <div style={{ padding: '5px 20px 20px', fontFamily: 'Inter, sans-serif' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #EADCC9', width: '100%', marginBottom: '10px',
        gap: '15px', flexWrap: 'wrap', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo mã máy hoặc tên máy..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 38px', border: '1.5px solid #EADCC9', 
                borderRadius: '8px', outline: 'none', fontSize: '13px',
                backgroundColor: '#fff', color: '#7B5233'
              }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233' }}>
            <Filter size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div>
          <button 
            onClick={() => navigate('/admin/machines')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
          >
            Quản lý máy móc
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          Tài liệu hướng dẫn vận hành máy
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 1s linear infinite', margin: '0 auto 15px auto' }} />
            Đang tải dữ liệu hướng dẫn...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredMachines.map((m) => (
              <div 
                key={m.id}
                onClick={() => navigate(`/admin/machines/detail/${m.id}`)}
                style={{
                  border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
                  backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7B5233';
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(123, 82, 51, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#EADCC9', color: '#7B5233', padding: '2px 6px', borderRadius: '4px' }}>
                    {m.code}
                  </span>
                  <BookOpen size={16} color="#7B5233" />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b', lineHeight: '1.4' }}>
                  {m.name}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                  <span>Tổ/Bộ phận: <strong style={{ color: '#334155' }}>{m.department || 'Chưa gán'}</strong></span>
                  <span>Xuất xứ: <strong style={{ color: '#334155' }}>{m.origin || 'Chưa gán'}</strong></span>
                </div>
                <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#7B5233', fontWeight: '700', alignItems: 'center', gap: '4px' }}>
                  <Eye size={14} /> Xem hướng dẫn
                </div>
              </div>
            ))}
            {filteredMachines.length === 0 && (
              <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Không tìm thấy máy nào để xem hướng dẫn sử dụng.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineTrainingView;
