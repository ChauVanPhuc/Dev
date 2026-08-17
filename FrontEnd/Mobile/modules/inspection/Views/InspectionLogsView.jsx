import React, { useState, useEffect } from 'react';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import { Search, Filter, Calendar, User, FileText, ChevronRight, Pencil, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/services/api';
import InspectionDetailPopup from './components/InspectionDetailPopup';

/**
 * InspectionLogs Screen
 * Nhật ký kiểm tra (Historical logs).
 */
const InspectionLogs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleLogClick = async (log) => {
    if (log.id.includes('daily')) {
      // For daily logs, currently navigate to detail page as before
      // or implement another popup if needed
      const path = '/inspection-daily';
      navigate(path, { state: { logId: log.originalId, type: log.type } });
      return;
    }

    // For stage logs, fetch full detail and show popup
    setIsDetailLoading(true);
    try {
      const res = await apiClient.get(`inspections/stage/${log.originalId}`);
      if (res.data) {
        setSelectedLog(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết nhật ký:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const [resDaily, resStage] = await Promise.all([
          apiClient.get('inspections/daily'),
          apiClient.get('inspections/stage')
        ]);

        const dailyLogs = (resDaily.data || []).map(item => ({
          id: `daily_${item.id}`,
          originalId: item.id,
          date: new Date(item.inspection_date).toLocaleDateString('vi-VN'),
          timestamp: new Date(item.inspection_date).getTime(),
          type: 'Kiểm tra hằng ngày',
          target: item.stage_name || 'Không rõ khu vực',
          inspector: item.inspector_name || 'Hệ thống',
          result: item.total_defects > 0 ? 'Không đạt' : 'Đạt',
          statusColor: item.total_defects > 0 ? '#ef4444' : '#22c55e'
        }));

        const stageLogs = (resStage.data || []).map(item => ({
          id: `stage_${item.id}`,
          originalId: item.id,
          date: new Date(item.inspection_date).toLocaleDateString('vi-VN'),
          timestamp: new Date(item.inspection_date).getTime(),
          type: (() => {
            const map = {
              'nhap-kho': 'Kiểm tra Nhập kho',
              'dau-vao': 'Kiểm tra Nhập kho',
              'do-am': 'Kiểm tra Độ ẩm',
              'kich-thuoc': 'Kiểm tra Kích thước',
              'ngoai-quan': 'Kiểm tra Ngoại quan',
              'chuc-nang': 'Kiểm tra Chức năng',
              'cong-doan': 'Kiểm tra Công đoạn',
              'quy-trinh': 'Kiểm tra Quy trình',
              'bam-dinh': 'Kiểm tra Bám dính',
              'sau-dong-goi': 'Kiểm tra Sau đóng gói'
            };
            return map[item.inspection_type] || `Kiểm tra ${item.inspection_type}`;
          })(),
          target: item.batch_no || 'N/A',
          inspector: item.inspector_name,
          result: item.conclusion === 'pass' ? 'Đạt' : 'Không đạt',
          statusColor: item.conclusion === 'pass' ? '#22c55e' : '#ef4444'
        }));

        const combined = [...dailyLogs, ...stageLogs].sort((a, b) => b.timestamp - a.timestamp);
        setLogs(combined);
      } catch (err) {
        console.error("Lỗi khi tải nhật ký:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const target = log.target || '';
    const inspector = log.inspector || '';
    const typeStr = log.type || '';
    const query = searchQuery || '';
    
    return target.toLowerCase().includes(query.toLowerCase()) ||
           inspector.toLowerCase().includes(query.toLowerCase()) ||
           typeStr.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <Layout>
      <div style={{ backgroundColor: '#f8f4f0', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, paddingBottom: '30px', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB7 | Nhật ký kiểm tra" />

        <div style={{ padding: '16px' }}>
          {/* Thanh tìm kiếm và Lọc */}
          <div id="logs-search-filter" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              padding: '0 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <Search size={20} color="#94a3b8" />
              <input 
                placeholder="Tìm theo lô hàng, người kiểm..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '12px', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#1e293b' }}
              />
            </div>
            <button style={{ 
              padding: '12px', 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px',
              color: '#64748b'
            }}>
              <Filter size={24} />
            </button>
          </div>

          {/* Danh sách nhật ký */}
          <div id="logs-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                <Loader2 size={40} className="animate-spin" color="#94a3b8" />
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang tải nhật ký...</span>
                <style dangerouslySetInnerHTML={{ __html: `
                  .animate-spin { animation: spin 1s linear infinite; }
                  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Không tìm thấy nhật ký kiểm tra nào.</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div 
                  key={log.id} 
                  id={idx === 0 ? "logs-first-item" : undefined}
                  onClick={() => handleLogClick(log)}
                  style={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {/* Icon loại kiểm tra */}
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    backgroundColor: log.type.includes('hằng ngày') ? '#eff6ff' : '#f5f3ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: log.type.includes('hằng ngày') ? '#3b82f6' : '#8b5cf6'
                  }}>
                    {log.type.includes('hằng ngày') ? <Calendar size={24} /> : <FileText size={24} />}
                  </div>

                  {/* Thông tin chính */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>{log.date}</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '800', 
                        color: log.statusColor, 
                        backgroundColor: `${log.statusColor}15`, 
                        padding: '2px 8px', 
                        borderRadius: '20px' 
                      }}>
                        {log.result.toUpperCase()}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>{log.target}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                          <User size={14} /> <span>{log.inspector}</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <FileText size={14} /> <span>{log.type}</span>
                       </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ChevronRight size={20} color="#cbd5e1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popup chi tiết */}
        <InspectionDetailPopup 
          item={selectedLog} 
          onClose={() => setSelectedLog(null)} 
        />

        {/* Overlay loading khi tải chi tiết */}
        {isDetailLoading && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} className="animate-spin" color="#4b301e" />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InspectionLogs;
