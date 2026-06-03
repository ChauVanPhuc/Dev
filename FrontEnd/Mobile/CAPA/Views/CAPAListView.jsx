import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, User, Calendar, Clipboard } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import DataTable from '@mobile/Shared/Views/components/ui/DataTable';
import apiClient from '@shared/services/api';

const CAPAList = () => {
  const navigate = useNavigate();
  const [capaList, setCapaList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fallback offline mock data matching DB seed
  const fallbackCapas = [
    {
      id: 1,
      error_name: 'Cong vênh',
      description: 'Cánh cửa bị cong dẫn đến đóng không được khít',
      severity: 'Nghiêm trọng',
      assigned_person: 'Hà Minh Xuân',
      latest_date: '27/08/2025',
      occurrence_count: 2
    },
    {
      id: 2,
      error_name: 'Không đồng màu',
      description: 'Sản phẩm bị lệch màu sơn phủ bề mặt ngoài',
      severity: 'Nặng',
      assigned_person: 'Đặng Minh Tuấn',
      latest_date: '22/11/2025',
      occurrence_count: 1
    },
    {
      id: 3,
      error_name: 'Sai tem nhãn',
      description: 'Tem mã vạch dán sai vị trí hoặc sai thông tin lô',
      severity: 'Nhẹ',
      assigned_person: 'Đặng Văn Nam',
      latest_date: '22/11/2025',
      occurrence_count: 1
    }
  ];

  // Fetch CAPAs from backend API
  useEffect(() => {
    let active = true;
    const fetchCapas = async () => {
      try {
        const resp = await apiClient.get('/capas/');
        if (active) {
          setCapaList(resp.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách CAPA, dùng mock:', err);
        if (active) {
          setCapaList(fallbackCapas);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCapas();
    return () => { active = false; };
  }, []);

  // Filter based on search term
  const filteredCapas = useMemo(() => {
    return capaList.filter(item => 
      item.error_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assigned_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.severity && item.severity.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [capaList, searchTerm]);

  // Total occurrences
  const totalOccurrences = useMemo(() => {
    return capaList.reduce((acc, curr) => acc + (curr.occurrence_count || 0), 0);
  }, [capaList]);

  const columns = [
    { header: 'Lỗi', key: 'error_name' },
    { header: 'Ngày ghi nhận', key: 'latest_date' },
    { header: 'Số lần', key: 'occurrence_count' },
    { header: 'Phụ trách', key: 'assigned_person' }
  ];

  const handleRowClick = (row) => {
    navigate(`/capa-report/${row.id}`);
  };

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="Báo cáo CAPA" />
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-cream)' }}>
        
        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #e8e1d5'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fff2e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#e65c00" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8c7e6e', fontWeight: '500' }}>Tổng nhóm lỗi</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#4b301e' }}>{capaList.length}</div>
            </div>
          </div>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #e8e1d5'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clipboard size={20} color="#4f46e5" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8c7e6e', fontWeight: '500' }}>Số lần phát sinh</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#4b301e' }}>{totalOccurrences}</div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Tìm kiếm nhóm lỗi, phụ trách..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              borderRadius: '12px',
              border: '1.5px solid #e8e1d5',
              fontSize: '14px',
              outline: 'none',
              color: '#4b301e',
              backgroundColor: '#fff'
            }}
          />
          <Search size={18} color="#8c7e6e" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Table list */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '8px', border: '1px solid #e8e1d5', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8c7e6e', fontWeight: '500' }}>
              Đang tải danh sách lỗi CAPA...
            </div>
          ) : filteredCapas.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8c7e6e', fontWeight: '500' }}>
              Không tìm thấy lỗi CAPA nào.
            </div>
          ) : (
            <DataTable columns={columns} data={filteredCapas} onRowClick={handleRowClick} />
          )}
        </div>

      </div>
    </Layout>
  );
};

export default CAPAList;
