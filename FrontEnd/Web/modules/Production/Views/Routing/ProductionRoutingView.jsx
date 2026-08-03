import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ArrowUpDown, Filter, Plus, Copy, MoreHorizontal, Upload, Download, ArrowRight, Layers, Building2, Wrench } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ProductionRoutingView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-routing');

  // Đặt Tiêu đề và Subtitle chuẩn theo Mockup Ảnh 1: "Quy trình - kế hoạch" / "SX04: Quy trình sản xuất"
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quy trình - kế hoạch');
    if (setCustomSubtitle) setCustomSubtitle('SX04: Quy trình sản xuất');
    if (setCustomScreenCode) setCustomScreenCode('SX04');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Tab đang được chọn: 'routing' (Quy trình) | 'products' (Danh sách sản phẩm) | 'workshops' (Danh sách tổ)
  const [activeTab, setActiveTab] = useState('routing');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock dữ liệu danh sách thành phần theo Tổ (Tab 1: Quy trình)
  const [componentsList, setComponentsList] = useState([
    { id: 1, team: 'Tổ định hình 1', compCode: 'TP-TA-01', compName: 'Hồi tủ áo gỗ sồi (Trái)', note: 'Độ dày 18mm' },
    { id: 2, team: 'Tổ định hình 1', compCode: 'TP-TA-02', compName: 'Hồi tủ áo gỗ sồi (Phải)', note: 'Độ dày 18mm' },
    { id: 3, team: 'Tổ định hình 2', compCode: 'TP-TA-03', compName: 'Cánh tủ áo phẳng CNC', note: 'Chạy rãnh tay móc' },
    { id: 4, team: 'Tổ định hình 3', compCode: 'TP-BA-01', compName: 'Mặt bàn ăn gỗ óc chó 1.8m', note: 'Vát cạnh 45 độ' },
    { id: 5, team: 'Đóng gói 1', compCode: 'TP-DG-01', compName: 'Bộ phụ kiện bản lề & đinh ốc', note: 'Đóng túi nilon' },
  ]);

  // Mock dữ liệu Sản phẩm áp dụng (Tab 2: Danh sách sản phẩm)
  const [appliedProducts, setAppliedProducts] = useState([
    { id: 1, code: 'TA-04-SO', name: 'Tủ áo 4 cánh Gỗ Sồi', applyDate: '2026-01-15' },
    { id: 2, code: 'BA-06-OC', name: 'Bàn ăn 6 ghế Gỗ Óc Chó', applyDate: '2026-02-01' },
    { id: 3, code: 'GN-KS-TB', name: 'Giường ngủ King Size Gỗ Tần Bì', applyDate: '2026-03-10' },
  ]);

  // Mock dữ liệu Danh sách tổ (Tab 3: Danh sách tổ)
  const [teamsList, setTeamsList] = useState([
    { id: 1, teamCode: 'TO-DH-01', teamName: 'Tổ định hình 1', factory: 'Nhà máy 1', desc: 'Gia công phay, cắt phôi gỗ tự nhiên' },
    { id: 2, teamCode: 'TO-DH-02', teamName: 'Tổ định hình 2', factory: 'Nhà máy 1', desc: 'Chạy máy CNC 4 đầu và rãnh mộng' },
    { id: 3, teamCode: 'TO-DH-03', teamName: 'Tổ định hình 3', factory: 'Nhà máy 2', desc: 'Cắt ván dán viền gỗ công nghiệp' },
    { id: 4, teamCode: 'TO-DH-04', teamName: 'Tổ định hình 4', factory: 'Nhà máy 2', desc: 'Chạy chỉ nẹp và khoan chốt tự động' },
    { id: 5, teamCode: 'TO-DG-01', teamName: 'Đóng gói 1', factory: 'Nhà máy 3', desc: 'Đóng thùng carton xuất khẩu' },
    { id: 6, teamCode: 'TO-DG-02', teamName: 'Đóng gói 2', factory: 'Nhà máy 3', desc: 'Bọc màng PE & xếp kiện pallet' },
  ]);

  return (
    <div style={{ padding: '20px 24px', backgroundColor: '#FAF6F0', minHeight: 'calc(100vh - 110px)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Navigation Bar (Tabs & Action Button góc phải) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '2px solid #EADCC9',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Sub-tabs Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {[
            { id: 'routing', label: 'Quy trình' },
            { id: 'products', label: 'Danh sách sản phẩm' },
            { id: 'workshops', label: 'Danh sách tổ' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab.id ? '800' : '600',
                color: activeTab === tab.id ? '#2D1A12' : '#6B7280',
                borderBottom: activeTab === tab.id ? '3px solid #2D1A12' : '3px solid transparent',
                paddingBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Button: Sao chép quy trình */}
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #2D1A12',
            borderRadius: '8px',
            color: '#2D1A12',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2D1A12'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#2D1A12'; }}
        >
          <Copy size={16} /> Sao chép quy trình
        </button>
      </div>

      {/* TAB 1: QUY TRÌNH (Match 100% Ảnh 1) */}
      {activeTab === 'routing' && (
        <div>
          {/* Card 1: Khung Nhà máy & Danh sách Tổ Badges (Match Ảnh 1) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {/* Nhà máy 1 */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6B7280', marginBottom: '10px' }}>Nhà máy 1</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#2D1A12', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Tổ định hình
                  </span>
                  <span style={{ backgroundColor: '#2D1A12', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Tổ định hình 2
                  </span>
                </div>
              </div>

              {/* Nhà máy 2 */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6B7280', marginBottom: '10px' }}>Nhà máy 2</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#D97706', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Tổ định hình 3
                  </span>
                  <span style={{ backgroundColor: '#D97706', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Tổ định hình 4
                  </span>
                </div>
              </div>

              {/* Nhà máy 3 */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#6B7280', marginBottom: '10px' }}>Nhà máy 3</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#3B82F6', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Đóng gói 1
                  </span>
                  <span style={{ backgroundColor: '#3B82F6', color: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem' }}>
                    Đóng gói 2
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Sơ đồ định tuyến Tổ (Routing Diagram Box - Match Ảnh 1) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: '#2D1A12',
                color: '#FFFFFF',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.95rem',
                boxShadow: '0 4px 10px rgba(45, 26, 18, 0.15)'
              }}>
                Tổ định hình
              </div>
              <ArrowRight size={24} color="#9CA3AF" />
              <div style={{
                backgroundColor: '#2D1A12',
                color: '#FFFFFF',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.95rem',
                boxShadow: '0 4px 10px rgba(45, 26, 18, 0.15)'
              }}>
                Tổ định hình
              </div>
            </div>
          </div>

          {/* Card 3: Toolbar Bar & Table Danh sách thành phần theo Tổ (Match Ảnh 1) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
          }}>
            {/* Toolbar Inside Table Container */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              borderBottom: '1.5px solid #EADCC9'
            }}>
              {/* Left Side: Search, A-Z Sort, Filter Funnel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  position: 'relative',
                  width: '260px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9'
                }}>
                  <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm thành phần..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <button title="Sắp xếp" style={{ padding: '8px 12px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', cursor: 'pointer' }}>
                  <ArrowUpDown size={18} />
                </button>
                <button title="Lọc dữ liệu" style={{ padding: '8px 12px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', cursor: 'pointer' }}>
                  <Filter size={18} />
                </button>
              </div>

              {/* Right Side: Action Buttons (Khác, Nhập dữ liệu, Xuất dữ liệu, + Thêm dữ liệu) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}>
                  Khác
                </button>
                <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={16} /> Nhập dữ liệu
                </button>
                <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={16} /> Xuất dữ liệu
                </button>
                <button style={{ padding: '8px 18px', background: '#5D3B32', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={18} /> + Thêm dữ liệu
                </button>
              </div>
            </div>

            {/* Table Component */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800', width: '60px' }}>STT</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', width: '180px' }}>Tổ</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', width: '200px' }}>Mã thành phần</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Tên thành phần</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {componentsList.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                        Chưa có dữ liệu thành phần.
                      </td>
                    </tr>
                  ) : (
                    componentsList.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF' }}>
                        <td style={{ padding: '12px 16px', color: '#6B7280', fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#2D1A12' }}>{item.team}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#5D3B32' }}>{item.compCode}</td>
                        <td style={{ padding: '12px 16px', color: '#1F2937', fontWeight: '600' }}>{item.compName}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button style={{ border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer' }}>
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH SẢN PHẨM (Match 100% Ảnh 1) */}
      {activeTab === 'products' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '60px' }}>STT</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '220px' }}>Mã sản phẩm</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800' }}>Tên sản phẩm</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '200px' }}>Thời gian áp dụng</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {appliedProducts.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontWeight: '600' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#5D3B32' }}>{p.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1F2937' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#4B5563' }}>{p.applyDate}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button style={{ border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer' }}>
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DANH SÁCH TỔ (Match 100% Ảnh 1) */}
      {activeTab === 'workshops' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '160px' }}>Mã tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '220px' }}>Tên tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '200px' }}>Tên nhà máy</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800' }}>Mô tả công việc</th>
                </tr>
              </thead>
              <tbody>
                {teamsList.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#5D3B32' }}>{t.teamCode}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1F2937' }}>{t.teamName}</td>
                    <td style={{ padding: '12px 16px', color: '#4B5563', fontWeight: '600' }}>{t.factory}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionRoutingView;
