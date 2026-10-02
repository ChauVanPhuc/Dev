import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Clock, Building2, Layers, AlertCircle, X, Search, BarChart3 } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';

// Danh sách các tùy chọn Nhà máy
const FACTORIES = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'NM1', label: 'Nhà máy 1' },
  { id: 'NM2', label: 'Nhà máy 2' },
  { id: 'NM3', label: 'Nhà máy 3' }
];

// Hàm nhận diện nhà máy khởi tạo từ tài khoản đăng nhập
const getInitialUserFactory = (u) => {
  const fId = String(u?.factory_id || u?.factoryId || '');
  const fName = String(u?.factory_name || u?.factoryName || u?.factory || '').toUpperCase();
  if (fId === '1' || fName.includes('PHÂN XƯỞNG 1') || fName.includes('NM1')) return 'NM1';
  if (fId === '2' || fName.includes('PHÂN XƯỞNG 2') || fName.includes('NM2')) return 'NM2';
  if (fId === '3' || fName.includes('NHÀ MÁY 3') || fName.includes('NM3')) return 'NM3';
  return 'ALL';
};

/**
 * Component SVG Donut Chart hiển thị Tỷ lệ lỗi theo công đoạn
 */
const StageDefectDonutChart = ({ stageDefects }) => {
  const items = stageDefects?.items || [];
  const total = stageDefects?.total || 0;

  // Cấu hình vòng tròn
  const size = 110;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Tính toán offset cho từng phân đoạn
  let accumulatedPercent = 0;
  const segments = useMemo(() => {
    if (total === 0 || items.length === 0) return [];
    let acc = 0;
    return items.map((item) => {
      const pct = item.pct || (total > 0 ? (item.count / total) * 100 : 0);
      const dashLength = (pct / 100) * circumference;
      const strokeDashoffset = -((acc / 100) * circumference);
      acc += pct;
      return {
        ...item,
        dashLength,
        strokeDashoffset
      };
    });
  }, [items, total, circumference]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Base background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Slices */}
          {segments.length > 0 ? (
            segments.map((seg, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color || '#78350F'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            ))
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
          )}
        </svg>

        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#1e293b', lineHeight: '1.1' }}>
            {total}
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#64748b' }}>
            Tổng lỗi
          </span>
        </div>
      </div>

      {/* Mini Legend */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        marginTop: '10px',
        padding: '0 2px'
      }}>
        {items.length > 0 ? (
          items.slice(0, 4).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.70rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                <span style={{ color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '68px' }}>
                  {item.stage}
                </span>
              </div>
              <span style={{ fontWeight: '800', color: '#1e293b' }}>
                {item.pct}%
              </span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', fontSize: '0.70rem', color: '#94a3b8', fontStyle: 'italic' }}>
            Không có lỗi
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Component Bottom Sheet Modal: Hiển thị chi tiết toàn bộ các lỗi cần theo dõi theo công đoạn
 */
const AllDefectsModal = ({
  visible,
  onClose,
  allDefects,
  summary,
  dateFilter = 'week',
  onDateFilterChange,
  rateComparison
}) => {
  if (!visible) return null;

  const activeStages = summary?.active_stages || [];
  const totalPeriod = summary?.total_period || summary?.total_week || allDefects.reduce((acc, d) => acc + (d.this_week || 0), 0);
  const dateLabel = summary?.date_label || (dateFilter === 'today' ? 'Hôm nay' : dateFilter === 'yesterday' ? 'Hôm qua' : 'Trong tuần');

  const maxDefect = Math.max(...allDefects.map(d => d.this_week || 0), 1);

  // Tính toán các mốc chia tỷ lệ trục X đẹp (25% khoảng trống cho nhãn số lượng & % ở đuôi thanh)
  const getNiceAxis = (val) => {
    const target = Math.max(val * 1.25, 5);
    if (target <= 10) return { max: 10, ticks: [0, 2, 4, 6, 8, 10] };
    if (target <= 20) return { max: 20, ticks: [0, 5, 10, 15, 20] };
    if (target <= 40) return { max: 40, ticks: [0, 10, 20, 30, 40] };
    if (target <= 60) return { max: 60, ticks: [0, 15, 30, 45, 60] };
    if (target <= 80) return { max: 80, ticks: [0, 20, 40, 60, 80] };
    if (target <= 100) return { max: 100, ticks: [0, 25, 50, 75, 100] };
    const step = Math.ceil(target / 4 / 10) * 10;
    const max = step * 4;
    return { max, ticks: [0, step, step * 2, step * 3, max] };
  };

  const axis = getNiceAxis(maxDefect);

  // Tính toán tỷ lệ % cho từng công đoạn trong phần chú thích (Legend)
  const stageStats = useMemo(() => {
    if (activeStages.some(s => s.pct !== undefined && s.pct > 0)) {
      return activeStages;
    }
    const stageCounts = {};
    let total = 0;
    allDefects.forEach(item => {
      (item.stages_breakdown || []).forEach(sb => {
        stageCounts[sb.stage] = (stageCounts[sb.stage] || 0) + (sb.count || 0);
        total += (sb.count || 0);
      });
    });
    return activeStages.map(stg => {
      const count = stageCounts[stg.stage] || 0;
      const pct = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      return { ...stg, count, pct };
    });
  }, [activeStages, allDefects]);

  // Dạng text tỷ lệ lỗi hôm nay / tuần này so với kỳ trước như ảnh 3:
  // - Số tỷ lệ tổng: màu nâu đậm (#432818)
  // - Phần tăng/giảm: tăng thì màu đỏ (#DC2626), giảm hoặc bằng thì màu xanh (#16A34A)
  const renderRateComparisonText = () => {
    if (!rateComparison) return null;
    if (dateFilter === 'week') {
      const cur = rateComparison.rate_this_week ?? rateComparison.current_rate ?? 0;
      const diff = rateComparison.delta_week ?? rateComparison.delta_rate ?? 0;
      const isInc = diff > 0;
      const trendColor = isInc ? '#DC2626' : '#16A34A';
      const diffText = diff === 0
        ? 'bằng tuần trước'
        : `${isInc ? '▲ tăng' : '▼ giảm'} ${Math.abs(diff)}% so với tuần trước`;
      return (
        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>
          Tỷ lệ lỗi tuần này: <strong style={{ color: '#432818', fontWeight: '800' }}>{cur}%</strong>{' '}
          <span style={{ color: trendColor, fontWeight: '700' }}>
            ({diffText})
          </span>
        </span>
      );
    } else if (dateFilter === 'today') {
      const cur = rateComparison.rate_today ?? rateComparison.current_rate ?? 0;
      const diff = rateComparison.delta_day ?? rateComparison.delta_rate ?? 0;
      const isInc = diff > 0;
      const trendColor = isInc ? '#DC2626' : '#16A34A';
      const diffText = diff === 0
        ? 'bằng hôm qua'
        : `${isInc ? '▲ tăng' : '▼ giảm'} ${Math.abs(diff)}% so với hôm qua`;
      return (
        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>
          Tỷ lệ lỗi hôm nay: <strong style={{ color: '#432818', fontWeight: '800' }}>{cur}%</strong>{' '}
          <span style={{ color: trendColor, fontWeight: '700' }}>
            ({diffText})
          </span>
        </span>
      );
    } else {
      // yesterday
      const cur = rateComparison.rate_yesterday ?? 0;
      return (
        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600' }}>
          Tỷ lệ lỗi hôm qua: <strong style={{ color: '#432818', fontWeight: '800' }}>{cur}%</strong>
        </span>
      );
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '94vh',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden'
        }}
      >
        {/* Thanh kéo nhỏ (Handle bar) */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#CBD5E1', margin: '8px auto 2px auto', flexShrink: 0 }} />

        {/* 1. Header Modal: Tiêu đề + Dòng text tỷ lệ lỗi tăng/giảm ở vị trí ảnh 3 */}
        <div style={{
          padding: '10px 14px 8px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F1F5F9',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#FDF4EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2px',
              flexShrink: 0
            }}>
              <BarChart3 size={16} color="#9A3412" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '900', color: '#432818' }}>
                Biểu đồ phân bổ lỗi theo công đoạn
              </h3>
              <div style={{ marginTop: '2px' }}>
                {renderRateComparisonText()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              flexShrink: 0
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 2. Dải gom gọn: Tổng số lỗi + Bộ lọc ngày (Hôm nay / Hôm qua / Trong tuần) như ảnh 3 */}
        <div style={{
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF5EE',
          borderBottom: '1px solid #F3E8DE',
          flexShrink: 0
        }}>
          {/* Tổng số lượng lỗi trong kỳ */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '0.90rem', fontWeight: '900', color: '#78350F' }}>
              {totalPeriod}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>
              lỗi được ghi nhận
            </span>
          </div>

          {/* 3 nút lọc Ngày: Hôm nay / Hôm qua / Trong tuần */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'yesterday', label: 'Hôm qua' },
              { id: 'week', label: 'Trong tuần' }
            ].map((p) => {
              const isActive = (dateFilter || 'week') === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onDateFilterChange && onDateFilterChange(p.id)}
                  style={{
                    border: isActive ? 'none' : '1px solid #E2E8F0',
                    backgroundColor: isActive ? '#5D3B32' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#64748B',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: isActive ? '800' : '600',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. VÙNG BIỂU ĐỒ HOÀN CHỈNH (Hiển thị số lượng trong từng đoạn công đoạn và đuôi thanh như ảnh 3) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '6px 14px 8px 14px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {allDefects && allDefects.length > 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '10px 10px 8px 4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {/* VÙNG ĐỒ THỊ CHÍNH (Trục Y + Plot Area) */}
              <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  {/* Đường lưới dọc (Vertical grid lines) */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '88px', right: 0, pointerEvents: 'none' }}>
                    {axis.ticks.map((t, idx) => {
                      const leftPct = (t / axis.max) * 100;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${leftPct}%`,
                            width: '1px',
                            backgroundColor: idx === 0 ? '#64748B' : '#F1F5F9',
                            borderLeft: idx === 0 ? '1.5px solid #64748B' : '1px dashed #E2E8F0',
                            zIndex: 0
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Từng dòng lỗi */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative', zIndex: 1 }}>
                    {allDefects.map((item, idx) => {
                      const wQty = item.this_week || 0;
                      const breakdown = item.stages_breakdown || [];
                      const barWidthPct = Math.max(2, Math.min(100, (wQty / axis.max) * 100));

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            height: '20px',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Trục Y: Tên lỗi */}
                          <div
                            style={{
                              width: '88px',
                              textAlign: 'right',
                              paddingRight: '8px',
                              fontSize: '0.70rem',
                              fontWeight: '700',
                              color: '#334155',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flexShrink: 0
                            }}
                            title={item.category}
                          >
                            {item.category}
                          </div>

                          {/* Thanh xếp chồng hiển thị số lượng theo từng công đoạn */}
                          <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <div
                              style={{
                                width: `${barWidthPct}%`,
                                height: '14px',
                                display: 'flex',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                transition: 'width 0.25s ease'
                              }}
                            >
                              {breakdown.map((sb, sIdx) => {
                                const segWidth = wQty > 0 ? (sb.count / wQty) * 100 : 0;
                                const segChartPct = (sb.count / axis.max) * 100;
                                return (
                                  <div
                                    key={sIdx}
                                    style={{
                                      width: `${segWidth}%`,
                                      height: '100%',
                                      backgroundColor: sb.color,
                                      borderRight: sIdx < breakdown.length - 1 ? '1px solid #FFFFFF' : 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      overflow: 'hidden'
                                    }}
                                    title={`${sb.stage}: ${sb.count} (${sb.pct}%)`}
                                  >
                                    {/* Hiển thị tỷ lệ % công đoạn bên trong đoạn thanh */}
                                    {segChartPct >= 8 ? (
                                      <span style={{ fontSize: '0.56rem', fontWeight: '800', color: '#FFFFFF', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                        {sb.pct}%
                                      </span>
                                    ) : segChartPct >= 5 ? (
                                      <span style={{ fontSize: '0.52rem', fontWeight: '700', color: '#FFFFFF', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                        {sb.pct}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Số lượng tổng & Tỷ lệ % của lỗi ở đuôi thanh (màu % nhạt đi) */}
                            <div
                              style={{
                                marginLeft: '5px',
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ fontSize: '0.66rem', fontWeight: '800', color: '#432818' }}>
                                {wQty}
                              </span>
                              {item.pct !== undefined && (
                                <span style={{ fontSize: '0.60rem', fontWeight: '600', color: '#94A3B8' }}>
                                  ({item.pct}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trục X: Đường trục + Mốc số */}
                <div style={{
                  display: 'flex',
                  marginLeft: '88px',
                  position: 'relative',
                  borderTop: '1.5px solid #64748B',
                  paddingTop: '2px',
                  height: '18px',
                  marginTop: '4px'
                }}>
                  {axis.ticks.map((t, idx) => {
                    const leftPct = (t / axis.max) * 100;
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ width: '1px', height: '3px', backgroundColor: '#64748B', marginTop: '-3px' }} />
                        <span style={{ fontSize: '0.64rem', fontWeight: '600', color: '#64748B' }}>
                          {t}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tiêu đề trục X */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.66rem',
                  fontWeight: '700',
                  color: '#64748B',
                  marginTop: '2px'
                }}>
                  Số lượng lỗi ghi nhận ({dateLabel})
                </div>

                {/* CHÚ THÍCH CÔNG ĐOẠN (Legend: Luôn 1 hàng, nếu bể thì chia đều 2-2) */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px 14px',
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px dashed #E2E8F0'
                }}>
                  {/* Nhóm thành các cặp 2 công đoạn để khi xuống dòng luôn chia đều 2 - 2 */}
                  {Array.from({ length: Math.ceil(stageStats.length / 2) }).map((_, pairIdx) => {
                    const pair = stageStats.slice(pairIdx * 2, pairIdx * 2 + 2);
                    return (
                      <div
                        key={pairIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        {pair.map((stg, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#334155', whiteSpace: 'nowrap' }}>
                              {stg.stage}
                            </span>
                            <span style={{ fontSize: '0.66rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap' }}>
                              ({stg.pct}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: '#94A3B8',
              fontSize: '0.78rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0'
            }}>
              Không có dữ liệu lỗi phù hợp trong khoảng thời gian này.
            </div>
          )}
        </div>

        {/* 4. Footer nút Đóng */}
        <div style={{
          padding: '6px 14px 10px 14px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          backgroundColor: '#FFFFFF',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#5D3B32',
              color: '#FFF',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductionDashboardView = () => {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNotifIndex, setCurrentNotifIndex] = useState(0);

  // Bộ lọc nhà máy & ngày
  const [selectedFactory, setSelectedFactory] = useState(() => getInitialUserFactory(user));
  const [showAllDefectsModal, setShowAllDefectsModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('week');

  const fetchData = async (factoryCode = selectedFactory, dFilter = dateFilter) => {
    try {
      const resp = await apiClient.get('/production-v2/dashboard', {
        params: {
          employee_id: user?.employee_id || undefined,
          factory: factoryCode !== 'ALL' ? factoryCode : undefined,
          date_filter: dFilter
        }
      });
      setData(resp.data || resp);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Production Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedFactory);
    // Đồng bộ tự động sau mỗi 10 giây
    const pollInterval = setInterval(() => fetchData(selectedFactory), 10000);
    return () => clearInterval(pollInterval);
  }, [user?.employee_id, selectedFactory]);

  // Tự động xoay vòng trượt thông báo sau 5 giây nếu có trên 1 thông báo
  useEffect(() => {
    if (data && data.notifications && data.notifications.length > 1) {
      const timer = setInterval(() => {
        setCurrentNotifIndex(prev => (prev + 1) % data.notifications.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [data]);

  const handleSelectFactory = (facId) => {
    setSelectedFactory(facId);
    setLoading(true);
    fetchData(facId);
  };

  if (loading || !data) {
    return (
      <Layout>
        <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải dữ liệu...</div>
      </Layout>
    );
  }

  const rawMax = data.tracked_defects && data.tracked_defects.length > 0
    ? Math.max(...data.tracked_defects.map(d => (d.this_week || 0) + (d.yesterday || 0)))
    : 0;
  const maxDefectValue = Math.max(rawMax, 10);

  // Nhãn nhà máy đang chọn để hiển thị tiêu đề
  const currentFactoryLabel = FACTORIES.find(f => f.id === selectedFactory)?.label || 'Tất cả';

  return (
    <Layout>
      <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
        
        {/* Card 1: Hiển thị thông báo mới (GIỮ NGUYÊN 100% LOGIC BANNER CŨ) */}
        {data.notifications && data.notifications.length > 0 && (() => {
          const notifs = data.notifications;
          const currentNotif = notifs[currentNotifIndex % notifs.length] || notifs[0];
          const hasMultiple = notifs.length > 1;

          return (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '18px 14px 14px 14px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '105px'
            }}>
              {/* Nút mũi tên trái */}
              {hasMultiple && (
                <button
                  type="button"
                  onClick={() => setCurrentNotifIndex(prev => (prev - 1 + notifs.length) % notifs.length)}
                  style={{
                    position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'rgba(241, 245, 249, 0.95)', borderRadius: '50%',
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#475569', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Nút mũi tên phải */}
              {hasMultiple && (
                <button
                  type="button"
                  onClick={() => setCurrentNotifIndex(prev => (prev + 1) % notifs.length)}
                  style={{
                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'rgba(241, 245, 249, 0.95)', borderRadius: '50%',
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#475569', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Nội dung thông báo */}
              <div style={{ padding: hasMultiple ? '0 38px' : '0 10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#432818', wordBreak: 'break-word' }}>
                  {currentNotif.title || 'Hiển thị thông báo mới'}
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#475569', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {currentNotif.content}
                </p>
              </div>

              {/* Các chấm chuyển đổi (Carousel Dots) */}
              {hasMultiple && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
                  {notifs.slice(0, 8).map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setCurrentNotifIndex(idx)}
                      style={{
                        width: idx === (currentNotifIndex % notifs.length) ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: idx === (currentNotifIndex % notifs.length) ? '#5D3B32' : '#CBD5E1',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Thanh chọn Nhà máy (Lọc lỗi & dữ liệu theo Nhà máy) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '4px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          {FACTORIES.map((fac) => {
            const isSelected = selectedFactory === fac.id;
            return (
              <button
                key={fac.id}
                type="button"
                onClick={() => handleSelectFactory(fac.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isSelected ? '#5D3B32' : 'transparent',
                  color: isSelected ? '#fff' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                {fac.label}
              </button>
            );
          })}
        </div>

        {/* Cụm 2 Cột: Biểu đồ tròn tỷ lệ lỗi công đoạn & Khối KPI (Nằm kế bên nhau) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: '10px'
        }}>
          {/* Cột Trái: Biểu đồ tròn tỷ lệ lỗi theo công đoạn */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '14px 10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={14} color="#78350F" />
              <h4 style={{ margin: 0, fontSize: '0.80rem', fontWeight: '800', color: '#432818', whiteSpace: 'nowrap' }}>
                Tỷ lệ lỗi công đoạn
              </h4>
            </div>

            {/* SVG Donut Chart */}
            <StageDefectDonutChart stageDefects={data.stage_defects} />
          </div>

          {/* Cột Phải: Khối KPI kế bên biểu đồ tròn */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '14px 12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {data.kpi_month && data.kpi_month.items && data.kpi_month.items.length > 0 ? (
              <>
                {/* Điểm KPI tháng */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#432818' }}>
                    {data.kpi_month.month || 'KPI tháng'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '2px' }}>
                    <span style={{ fontSize: '2.1rem', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>
                      {data.kpi_month.score}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>
                      Điểm
                    </span>
                  </div>
                </div>

                {/* Danh sách mục tiêu KPI */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {data.kpi_month.items.slice(0, 3).map((kpi, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }} title={kpi.full_name || kpi.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: '700' }}>
                        <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }}>
                          {kpi.name}
                        </span>
                        <span style={{ color: '#1e293b' }}>
                          {kpi.value}%
                        </span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, kpi.value))}%`, backgroundColor: '#78350f', height: '100%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Nếu nhân sự chưa có KPI cá nhân: Hiển thị card trạng thái chuẩn xưởng */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                gap: '6px',
                padding: '8px 4px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#432818' }}>
                  KPI Chất Lượng
                </span>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#B45309',
                  fontWeight: '900',
                  fontSize: '1rem'
                }}>
                  A
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', lineHeight: '1.2' }}>
                  Đạt chuẩn vận hành ca xưởng
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Các lỗi cần theo dõi (Số liệu thực tế theo Nhà máy đã chọn) */}
        {data.tracked_defects && data.tracked_defects.length > 0 && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: '900', color: '#ea580c' }}>
                  Các lỗi cần theo dõi
                </h3>
                {selectedFactory !== 'ALL' && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#78350F', backgroundColor: '#FDF4EB', padding: '1px 6px', borderRadius: '4px' }}>
                    {currentFactoryLabel}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAllDefectsModal(true)}
                style={{
                  border: '1px solid #F1E5D8',
                  backgroundColor: '#FAF6F0',
                  color: '#78350F',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                Tất cả
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontWeight: '700' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#78350f' }} />
                <span style={{ color: '#475569' }}>Trong tuần</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fde68a' }} />
                <span style={{ color: '#475569' }}>Hôm qua</span>
              </div>
            </div>

            {/* Stacked Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '125px', paddingTop: '10px', gap: '6px' }}>
              {data.tracked_defects.map((def, idx) => {
                const wQty = def.this_week || 0;
                const yQty = def.yesterday || 0;
                const weekHeight = Math.max(0, (wQty / maxDefectValue) * 85);
                const yestHeight = Math.max(0, (yQty / maxDefectValue) * 85);

                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {/* Số lượng tổng lỗi hiển thị trên đầu cột */}
                    <span style={{ fontSize: '0.68rem', color: '#78350f', fontWeight: '800', marginBottom: '2px' }}>
                      {wQty + yQty > 0 ? `${wQty}` : ''}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', overflow: 'hidden', width: '100%', maxWidth: '28px' }}>
                      {yestHeight > 0 && <div style={{ height: `${yestHeight}px`, backgroundColor: '#fde68a' }} title={`Hôm qua: ${yQty}`} />}
                      {weekHeight > 0 && <div style={{ height: `${weekHeight}px`, backgroundColor: '#78350f' }} title={`Trong tuần: ${wQty}`} />}
                      {yestHeight === 0 && weekHeight === 0 && <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: '600', maxWidth: '46px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={def.category}>
                      {def.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card 4: CheckList - Tính năng đang phát triển */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Header Card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={18} color="#D97706" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#432818' }}>
                CheckList công việc
              </h3>
            </div>
            
            {/* Badge Tính năng đang phát triển */}
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '800',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Sparkles size={12} color="#D97706" />
              Đang phát triển
            </span>
          </div>

          {/* Description & Placeholder UI */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '14px',
            border: '1px dashed #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.45' }}>
              Hệ thống phân bổ và giám sát <strong style={{ color: '#432818' }}>CheckList ca sản xuất</strong> đang được nâng cấp quy trình tự động và kiểm chuẩn chất lượng.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94A3B8', fontWeight: '600' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
              Dự kiến phát hành trong phiên bản cập nhật tiếp theo.
            </div>
          </div>
        </div>

      </div>

      {/* Modal Chi tiết Toàn bộ Lỗi khi bấm Tất cả */}
      <AllDefectsModal
        visible={showAllDefectsModal}
        onClose={() => setShowAllDefectsModal(false)}
        allDefects={data.all_tracked_defects || []}
        summary={data.defects_summary}
        dateFilter={dateFilter}
        onDateFilterChange={(newMode) => {
          setDateFilter(newMode);
          fetchData(selectedFactory, newMode);
        }}
        rateComparison={data.rate_comparison}
      />
    </Layout>
  );
};

export default ProductionDashboardView;
