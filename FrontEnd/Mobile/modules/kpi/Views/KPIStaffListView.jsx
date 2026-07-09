import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserRoundCheck, ClipboardCheck, AlertCircle } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import DataTable from '@mobile/Shared/Views/components/ui/DataTable';
import apiClient from '@shared/services/api';

const KPIStaffList = () => {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fallback offline mock data matching DB structure
  const fallbackData = [
    {
      id: 1,
      staff_name: 'Hồ Sỹ Khấn',
      stage: 'Định hình 1',
      level: 'A',
      department: 'QLCL',
      goal_score: 110.0,
      actual_score: 80.0,
      status: 'Chưa đánh giá',
      rating: 'A'
    },
    {
      id: 2,
      staff_name: 'Nguyễn Văn Lương',
      stage: 'Định hình 1',
      level: 'A',
      department: 'QLCL',
      goal_score: 100.0,
      actual_score: 110.0,
      status: 'Đã đánh giá',
      rating: 'A'
    },
    {
      id: 3,
      staff_name: 'Trần Thị Anh',
      stage: 'Định hình 1',
      level: 'A',
      department: 'QLCL',
      goal_score: 105.0,
      actual_score: 105.0,
      status: 'Đã đánh giá',
      rating: 'B'
    }
  ];

  // Fetch QC staff list
  useEffect(() => {
    let active = true;
    const fetchStaffList = async () => {
      try {
        const resp = await apiClient.get('/staff-evaluations/');
        if (active) {
          setStaffList(resp.data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách nhân sự đánh giá, dùng mock fallback:', err);
        if (active) {
          setStaffList(fallbackData);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStaffList();
    return () => { active = false; };
  }, []);

  // Filter staff by search keyword
  const filteredStaff = useMemo(() => {
    return staffList.filter(item => 
      item.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = staffList.length;
    const evaluated = staffList.filter(s => s.status === 'Đã đánh giá').length;
    const pending = total - evaluated;
    return { total, evaluated, pending };
  }, [staffList]);

  const columns = [
    { header: 'Nhân sự', key: 'staff_name' },
    { header: 'Mục tiêu', key: 'goal_score' },
    { header: 'Thực hiện', key: 'actual_score' },
    { 
      header: 'Trạng thái', 
      key: 'status',
      render: (row) => {
        const isDone = row.status === 'Đã đánh giá';
        return (
          <span style={{
            backgroundColor: isDone ? '#dcfce7' : '#fee2e2',
            color: isDone ? '#166534' : '#991b1b',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700',
            whiteSpace: 'nowrap'
          }}>
            {row.status}
          </span>
        );
      }
    }
  ];

  const handleRowClick = (row) => {
    navigate(`/staff-evaluation/${row.id}`);
  };

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB8.2 | Đánh giá nhân sự" />
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-cream)' }}>
        
        {/* Statistics Cards */}
        <div id="kpi-staff-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserRoundCheck size={20} color="#166534" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8c7e6e', fontWeight: '500' }}>Đã đánh giá</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#4b301e' }}>{stats.evaluated} / {stats.total}</div>
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
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} color="#991b1b" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8c7e6e', fontWeight: '500' }}>Chờ đánh giá</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#4b301e' }}>{stats.pending}</div>
            </div>
          </div>
        </div>
 
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="kpi-staff-search"
            type="text"
            placeholder="Tìm kiếm nhân sự, công đoạn..."
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
 
        {/* DataTable Container */}
        <div id="kpi-staff-table-container" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '8px', border: '1px solid #e8e1d5', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8c7e6e', fontWeight: '500' }}>
              Đang tải danh sách nhân sự...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#8c7e6e', fontWeight: '500' }}>
              Không tìm thấy nhân sự nào.
            </div>
          ) : (
            <DataTable columns={columns} data={filteredStaff} onRowClick={handleRowClick} />
          )}
        </div>
        
      </div>
    </Layout>
  );
};

export default KPIStaffList;
