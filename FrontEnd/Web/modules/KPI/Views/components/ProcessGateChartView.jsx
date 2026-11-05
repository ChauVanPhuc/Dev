import React from 'react';
import { ArrowDown, CheckCircle, ShieldAlert, Award, User, ExternalLink } from 'lucide-react';

const ProcessGateChartView = ({ onSelectEmployee, employees = [] }) => {
  const findEmp = (nameOrId) => {
    return employees.find(e => 
      e.employee_id === nameOrId || 
      (e.full_name && e.full_name.toLowerCase().includes(String(nameOrId).toLowerCase()))
    );
  };

  const handleClick = (nameOrId, defaultData = {}) => {
    const found = findEmp(nameOrId);
    if (found) {
      onSelectEmployee?.(found.raw_data || found);
    } else {
      onSelectEmployee?.({
        employee_name: defaultData.name || nameOrId,
        stage: defaultData.stage || 'QC',
        factory: defaultData.factory || 'Nhà máy',
        current_level: defaultData.level || 'Cấp 4'
      });
    }
  };

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '24px 20px',
      backgroundColor: '#FAF8F5',
      borderRadius: '14px',
      border: '1.5px solid #EADCC9',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxSizing: 'border-box'
    }}>
      {/* 🔴 HEADER: CHỐT CHẶN 1 - ĐẶNG VĂN NAM */}
      <div 
        onClick={() => handleClick('3973', { name: 'Đặng Văn Nam', stage: 'Trưởng Phòng QLCL', level: 'Cấp 1' })}
        style={{
          position: 'relative',
          border: '2.5px solid #38BDF8',
          backgroundColor: '#E0F2FE',
          borderRadius: '10px',
          padding: '16px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 10px rgba(56, 189, 248, 0.15)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(56, 189, 248, 0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(56, 189, 248, 0.15)'; }}
      >
        <div style={{
          position: 'absolute', top: '-12px', left: '16px',
          backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
          width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>1</div>
        <h2 style={{ margin: 0, color: '#DC2626', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quản lý, điều phối, xử lý và chịu trách nhiệm chính
        </h2>
        <div style={{ marginTop: '4px', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
          Đặng Văn Nam
        </div>
        <span style={{ fontSize: '0.75rem', color: '#0369A1', fontWeight: 700 }}>Trưởng Phòng QLCL • Toàn diện hệ thống</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0' }}>
        <ArrowDown size={28} color="#F97316" strokeWidth={3} />
      </div>

      {/* 🔴 CHỐT CHẶN 2 - NGÔ DIỄM MY */}
      <div 
        onClick={() => handleClick('5981', { name: 'Ngô Diễm My', stage: 'QA Lead', level: 'Cấp 2' })}
        style={{
          position: 'relative',
          border: '2px solid #F97316',
          backgroundColor: '#FFF7ED',
          borderRadius: '10px',
          padding: '12px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 3px 8px rgba(249, 115, 22, 0.1)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(249, 115, 22, 0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(249, 115, 22, 0.1)'; }}
      >
        <div style={{
          position: 'absolute', top: '-11px', left: '16px',
          backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>2</div>
        <div style={{ color: '#991B1B', fontSize: '0.95rem', fontWeight: 800 }}>
          Phân tích vấn đề, Lập báo cáo đối ứng, đề xuất cải tiến, đánh giá CAPA
        </div>
        <div style={{ marginTop: '2px', fontSize: '1.05rem', fontWeight: 900, color: '#1E293B' }}>
          Ngô Diễm My
        </div>
        <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 700 }}>QA Lead • Kiểm soát đối ứng & Hệ thống</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0' }}>
        <ArrowDown size={24} color="#F97316" strokeWidth={3} />
      </div>

      {/* ── KHU VỰC TRUNG TÂM: MỐC CÔNG ĐOẠN + 3 CỘT NHÀ MÁY + CỘT ĐẶNG MINH TUẤN ── */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch' }}>
        {/* CỘT MỐC CÔNG ĐOẠN TRÁI */}
        <div style={{
          width: '110px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0
        }}>
          {[
            { name: 'Nhập kho', bg: '#EDE9FE', border: '#C4B5FD', color: '#5B21B6' },
            { name: 'Định hình', bg: '#F1F5F9', border: '#CBD5E1', color: '#334155' },
            { name: 'Lắp ráp', bg: '#F1F5F9', border: '#CBD5E1', color: '#334155' },
            { name: 'Bàn giao', bg: '#FEF3C7', border: '#FCD34D', color: '#92400E' },
            { name: 'Sau sơn', bg: '#F1F5F9', border: '#CBD5E1', color: '#334155' },
            { name: 'Đóng gói', bg: '#F1F5F9', border: '#CBD5E1', color: '#334155' },
            { name: 'Sau đóng gói', bg: '#DCFCE7', border: '#86EFAC', color: '#166534' }
          ].map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: m.bg,
              border: `1.5px solid ${m.border}`,
              borderRadius: '8px',
              padding: '10px 6px',
              textAlign: 'center',
              fontSize: '0.78rem',
              fontWeight: 800,
              color: m.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}>
              {m.name}
            </div>
          ))}
        </div>

        {/* KHỐI 3 CỘT XƯỞNG NHÀ MÁY */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Mốc Nhập kho (Đặng Quý Hải) */}
          <div 
            onClick={() => handleClick('0027', { name: 'Đặng Quý Hải', stage: 'IQC', level: 'Cấp 3' })}
            style={{
              border: '2px solid #A78BFA',
              backgroundColor: '#F5F3FF',
              borderRadius: '8px',
              padding: '10px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute', top: '-10px', left: '12px',
              backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
              width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '0.7rem'
            }}>3</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#5B21B6' }}>Kiểm tra nguyên liệu đầu vào (IQC)</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1E1B4B' }}>Đặng Quý Hải</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
            <ArrowDown size={20} color="#F97316" strokeWidth={2.5} />
          </div>

          {/* VÙNG ĐỊNH HÌNH & LẮP RÁP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.1fr', gap: '10px' }}>
            {/* NM 2.1 (Pigment) */}
            <div style={{ backgroundColor: '#E0F2FE', border: '1.5px solid #BAE6FD', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369A1', textAlign: 'center', marginBottom: '8px' }}>
                Vanity dòng Pigment (Nhà máy 2.1)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div onClick={() => handleClick('0428')} style={{ backgroundColor: '#fff', border: '1px solid #7DD3FC', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 700 }}>KT ĐH Khung</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Hồ Sỹ Khẩn</div>
                </div>
                <div onClick={() => handleClick('5014')} style={{ backgroundColor: '#fff', border: '1px solid #7DD3FC', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 700 }}>KT ĐH Mặt Thớt</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Nguyễn Văn Tiển</div>
                </div>
                <div onClick={() => handleClick('6137')} style={{ backgroundColor: '#fff', border: '1px solid #7DD3FC', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 700 }}>KT Lắp Ráp Khung</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Bùi Công Sự</div>
                </div>
              </div>
            </div>

            {/* NM 1 (OAK) */}
            <div style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textAlign: 'center', marginBottom: '8px' }}>
                Vanity dòng OAK (Nhà máy 1)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div onClick={() => handleClick('0288')} style={{ backgroundColor: '#fff', border: '1px solid #FCD34D', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>KT ĐH Khung</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Đậu Thị Tâm</div>
                </div>
                <div style={{ backgroundColor: '#FFFBEB', border: '1px dashed #F59E0B', borderRadius: '6px', padding: '6px 8px', textAlign: 'center', color: '#B45309' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>KT ĐH Mặt Thớt</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, fontStyle: 'italic' }}>Thiếu nhân sự</div>
                </div>
                <div onClick={() => handleClick('5267')} style={{ backgroundColor: '#fff', border: '1px solid #FCD34D', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>KT Lắp Ráp Khung</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Trần Trung Đức</div>
                </div>
              </div>
            </div>

            {/* NM 3 (OAK & Gia công ngoài) */}
            <div style={{ backgroundColor: '#DCFCE7', border: '1.5px solid #BBF7D0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', textAlign: 'center' }}>
                Vanity dòng OAK (Nhà máy 3)
              </div>
              <div onClick={() => handleClick('3396')} style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', color: '#B91C1C', fontWeight: 700 }}>Điều phối giám sát xử lý sự cố</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#991B1B' }}>Đỗ Hữu Phúc</div>
              </div>
              <div onClick={() => handleClick('0165')} style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>KT QC Gia công ngoài</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Hà Minh Xuân</div>
              </div>
              <div onClick={() => handleClick('0418')} style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>KT ĐH & Lắp ráp</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Huỳnh Hoàng Sơn</div>
              </div>
            </div>
          </div>

          {/* CHỐT BÀN GIAO ĐH - LR (HÀ ĐÌNH THÀNH) */}
          <div 
            onClick={() => handleClick('139', { name: 'Hà Đình Thành', stage: 'QC Supervisor 1', level: 'Cấp 3' })}
            style={{
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '8px',
              padding: '8px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 800 }}>
              🔴 Điều phối giám sát xử lý sự cố chất lượng, thực hiện bàn giao ĐH - LR:
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#991B1B' }}>
              Hà Đình Thành (QC Supervisor 1)
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
            <ArrowDown size={20} color="#F97316" strokeWidth={2.5} />
          </div>

          {/* CHỐT BÀN GIAO SƠN - ĐG (PHAN THỊ LƯƠNG) */}
          <div 
            onClick={() => handleClick('0556', { name: 'Phan Thị Lương', stage: 'QC Supervisor 2', level: 'Cấp 3' })}
            style={{
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '8px',
              padding: '8px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#B91C1C', fontWeight: 800 }}>
              🔴 Điều phối giám sát xử lý sự cố chất lượng, thực hiện bàn giao Sau Sơn - Đóng Gói:
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#991B1B' }}>
              Phan Thị Lương (QC Supervisor 2)
            </div>
          </div>

          {/* VÙNG SAU SƠN & ĐÓNG GÓI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.1fr', gap: '10px' }}>
            {/* NM 2.2 (Pigment Sau sơn - ĐG) */}
            <div style={{ backgroundColor: '#FFEDD5', border: '1.5px solid #FED7AA', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C2410C', textAlign: 'center', marginBottom: '8px' }}>
                Vanity dòng Pigment (Nhà máy 2.2)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div onClick={() => handleClick('5977')} style={{ backgroundColor: '#fff', border: '1px solid #FDBA74', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#EA580C', fontWeight: 700 }}>KT Xưởng Sau Sơn</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Lê Thị Hồng Nhung</div>
                </div>
                <div onClick={() => handleClick('6102')} style={{ backgroundColor: '#fff', border: '1px solid #FDBA74', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#EA580C', fontWeight: 700 }}>KT Xưởng Đóng Gói</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Trần Thị Ánh</div>
                </div>
                <div onClick={() => handleClick('6231')} style={{ backgroundColor: '#fff', border: '1px solid #FDBA74', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#EA580C', fontWeight: 700 }}>KT Sơn & Đóng Gói</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Đào Thị Huỳnh Như</div>
                </div>
              </div>
            </div>

            {/* NM 2 (OAK Sau sơn - ĐG) */}
            <div style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textAlign: 'center', marginBottom: '8px' }}>
                Vanity dòng OAK (Nhà máy 2)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div onClick={() => handleClick('5024')} style={{ backgroundColor: '#fff', border: '1px solid #FCD34D', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>KT Xưởng Sau Sơn</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Nguyễn Thị Hồng</div>
                </div>
                <div onClick={() => handleClick('0899')} style={{ backgroundColor: '#fff', border: '1px solid #FCD34D', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>KT Xưởng Đóng Gói</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Phạm Thị Mai</div>
                </div>
                <div onClick={() => handleClick('3670')} style={{ backgroundColor: '#fff', border: '1px solid #FCD34D', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700 }}>KT Xưởng Đóng Gói</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Thị Cẩm</div>
                </div>
              </div>
            </div>

            {/* NM 3 Sau sơn & ĐG */}
            <div style={{ backgroundColor: '#DCFCE7', border: '1.5px solid #BBF7D0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', textAlign: 'center', marginBottom: '8px' }}>
                Vanity dòng OAK (Nhà máy 3)
              </div>
              <div onClick={() => handleClick('3904')} style={{ backgroundColor: '#fff', border: '1px solid #86EFAC', borderRadius: '6px', padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700 }}>KT Sau Sơn & Đóng Gói</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Nguyễn Thị Mỷ Kim</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
            <ArrowDown size={20} color="#F97316" strokeWidth={2.5} />
          </div>

          {/* VÙNG FQC - SAU ĐÓNG GÓI */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div 
              onClick={() => handleClick('6086', { name: 'Đặng Minh Tuấn', stage: 'QC Lead 1 (FQC)', level: 'Cấp 2' })}
              style={{ backgroundColor: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '8px', padding: '8px', textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 700 }}>KT Final (FQC NM1 & NM2)</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#991B1B' }}>Đặng Minh Tuấn</div>
            </div>

            <div 
              onClick={() => handleClick('3396', { name: 'Đỗ Hữu Phúc', stage: 'QC Supervisor 3 (FQC NM3)', level: 'Cấp 3' })}
              style={{ backgroundColor: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '8px', padding: '8px', textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 700 }}>KT Final (FQC NM3)</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#991B1B' }}>Đỗ Hữu Phúc</div>
            </div>
          </div>
        </div>

        {/* CỘT DỌC ĐỎ 3: ĐẶNG MINH TUẤN */}
        <div 
          onClick={() => handleClick('6086', { name: 'Đặng Minh Tuấn', stage: 'QC Lead 1', level: 'Cấp 2' })}
          style={{
            width: '85px',
            border: '2px solid #EF4444',
            backgroundColor: '#FEF2F2',
            borderRadius: '10px',
            padding: '16px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0
          }}
        >
          <div style={{
            position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.75rem'
          }}>3</div>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.86rem',
            fontWeight: 800,
            color: '#B91C1C',
            lineHeight: 1.4,
            letterSpacing: '0.5px'
          }}>
            Đánh giá rủi ro, hỗ trợ lập CAPA, cung cấp thông tin đối ứng
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.95rem', fontWeight: 900, color: '#991B1B' }}>
            Đặng Minh Tuấn
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0' }}>
        <ArrowDown size={24} color="#F97316" strokeWidth={3} />
      </div>

      {/* 🔴 CHỐT CHẶN 4: HỒ SỸ LỊCH */}
      <div 
        onClick={() => handleClick('6289', { name: 'Hồ Sỹ Lịch', stage: 'QA Process', level: 'Cấp 3' })}
        style={{
          position: 'relative',
          border: '2px solid #F97316',
          backgroundColor: '#FFF7ED',
          borderRadius: '10px',
          padding: '12px 20px',
          textAlign: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{
          position: 'absolute', top: '-11px', left: '16px',
          backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.75rem'
        }}>4</div>
        <div style={{ color: '#991B1B', fontSize: '0.92rem', fontWeight: 800 }}>
          Theo dõi xu hướng lỗi, lập CAPA, cảnh báo lỗi, ban hành CTQ, SOS
        </div>
        <div style={{ marginTop: '2px', fontSize: '1.05rem', fontWeight: 900, color: '#1E293B' }}>
          Hồ Sỹ Lịch
        </div>
        <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 700 }}>QA Process • Quy trình & Cải tiến chất lượng</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0' }}>
        <ArrowDown size={24} color="#F97316" strokeWidth={3} />
      </div>

      {/* 🔴 CHỐT CHẶN 5: DƯƠNG THỊ LỆ UYÊN */}
      <div 
        onClick={() => handleClick('5100', { name: 'Dương Thị Lệ Uyên', stage: 'QC Admin', level: 'Cấp 3' })}
        style={{
          position: 'relative',
          border: '2px solid #F97316',
          backgroundColor: '#FFF7ED',
          borderRadius: '10px',
          padding: '12px 20px',
          textAlign: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{
          position: 'absolute', top: '-11px', left: '16px',
          backgroundColor: '#DC2626', color: '#fff', borderRadius: '50%',
          width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.75rem'
        }}>5</div>
        <div style={{ color: '#991B1B', fontSize: '0.92rem', fontWeight: 800 }}>
          Theo dõi nội dung hành chính, quản lý bản vẽ và thiết bị hiệu chuẩn, tổng hợp báo cáo
        </div>
        <div style={{ marginTop: '2px', fontSize: '1.05rem', fontWeight: 900, color: '#1E293B' }}>
          Dương Thị Lệ Uyên
        </div>
        <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 700 }}>QC Admin • Tài liệu, Thiết bị & Hành chính</span>
      </div>
    </div>
  );
};

export default ProcessGateChartView;

