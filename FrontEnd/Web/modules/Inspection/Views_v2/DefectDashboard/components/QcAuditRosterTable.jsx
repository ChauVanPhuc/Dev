import React, { useMemo } from 'react';
import { Users } from 'lucide-react';

// Bảng đánh giá năng suất đội ngũ kiểm định (QC Audit Roster):
// - Danh sách QC và các chỉ tiêu kiểm định
// - Dòng tổng cộng cố định ở cuối bảng
export const QcAuditRosterTable = ({ qcRoster = [] }) => {
  // Sắp xếp theo số phiếu kiểm tra giảm dần từ trên xuống dưới
  const sortedRoster = useMemo(() => {
    if (!Array.isArray(qcRoster) || qcRoster.length === 0) return [];
    return [...qcRoster].sort((a, b) => (b.total_inspections || 0) - (a.total_inspections || 0));
  }, [qcRoster]);

  // Tổng cộng toàn xưởng (tính tỷ lệ đạt sản phẩm đồng nhất với từng dòng QC)
  const totals = useMemo(() => {
    const total_inspections = sortedRoster.reduce((s, r) => s + (r.total_inspections || 0), 0);
    const passed_inspections = sortedRoster.reduce((s, r) => s + (r.passed_inspections || 0), 0);
    const failed_inspections = sortedRoster.reduce((s, r) => s + (r.failed_inspections || 0), 0);
    const defective_products = sortedRoster.reduce((s, r) => s + (r.defective_products || 0), 0);
    const total_products = sortedRoster.reduce((s, r) => s + (r.total_products || 0), 0);
    const passed_products = sortedRoster.reduce((s, r) => s + (r.passed_products ?? Math.max(0, (r.total_products || 0) - (r.defective_products || 0))), 0);

    const pass_rate = total_products > 0
      ? Math.round((passed_products / total_products) * 1000) / 10
      : (total_inspections > 0 ? Math.round((passed_inspections / total_inspections) * 1000) / 10 : 0.0);

    return {
      total_inspections,
      passed_inspections,
      failed_inspections,
      defective_products,
      pass_rate
    };
  }, [sortedRoster]);

  const hasData = sortedRoster.length > 0;

  return (
    <div className="erp-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Tiêu đề bảng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={15} style={{ color: '#795137' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#292524' }}>
            Đánh giá năng suất đội ngũ kiểm định (QC Audit Roster)
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600' }}>
          {sortedRoster.length} QC phụ trách
        </span>
      </div>

      {/* Nội dung bảng */}
      <div
        className="erp-chart-body"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #E8E2DC',
          borderRadius: '6px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden'
        }}
      >
        {!hasData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#78716C', fontSize: '0.78rem' }}>
            Không có dữ liệu nhân sự QC
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF3EC', zIndex: 2 }}>
                <tr style={{ height: '44px', borderBottom: '1.5px solid #E8E2DC', color: '#57534E' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                    Họ tên QC
                  </th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', lineHeight: 1.25 }}>
                    Công đoạn<br />chính
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', lineHeight: 1.25 }}>
                    Số<br />phiếu
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                    Đạt
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', lineHeight: 1.25 }}>
                    Không<br />đạt
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', lineHeight: 1.25 }}>
                    Tỷ lệ<br />đạt
                  </th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: '700', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                    SP lỗi
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRoster.map((r, idx) => (
                  <tr
                    key={r.id || r.inspector_name || idx}
                    style={{
                      borderBottom: '1px solid #F2ECE7',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFBF9'
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: '700', color: '#292524', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.inspector_name}
                    </td>
                    <td style={{ padding: '6px 6px', color: '#57534E', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.primary_stage}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '800', color: '#795137' }}>
                      {r.total_inspections}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700', color: '#15803D' }}>
                      {r.passed_inspections}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700', color: r.failed_inspections > 0 ? '#B91C1C' : '#78716C' }}>
                      {r.failed_inspections}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '800', color: r.pass_rate >= 70 ? '#15803D' : '#B91C1C' }}>
                      {r.pass_rate}%
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700', color: '#292524' }}>
                      {r.defective_products || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Dòng tổng cộng cố định ở cuối bảng */}
            <div style={{ marginTop: 'auto', position: 'sticky', bottom: 0, zIndex: 2, backgroundColor: '#FAF3EC', borderTop: '2px solid #795137' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <tfoot>
                  <tr style={{ fontWeight: '800' }}>
                    <td style={{ padding: '7px 8px', color: '#795137', fontWeight: '900', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Tổng cộng toàn xưởng
                    </td>
                    <td style={{ padding: '7px 6px' }}></td>
                    <td style={{ padding: '7px 4px', textAlign: 'center', fontWeight: '900', color: '#795137' }}>
                      {totals.total_inspections}
                    </td>
                    <td style={{ padding: '7px 4px', textAlign: 'center', color: '#15803D' }}>
                      {totals.passed_inspections}
                    </td>
                    <td style={{ padding: '7px 4px', textAlign: 'center', color: '#B91C1C' }}>
                      {totals.failed_inspections}
                    </td>
                    <td style={{ padding: '7px 4px', textAlign: 'center', fontWeight: '900', color: totals.pass_rate >= 70 ? '#15803D' : '#B91C1C' }}>
                      {totals.pass_rate}%
                    </td>
                    <td style={{ padding: '7px 4px', textAlign: 'center', color: '#292524' }}>
                      {totals.defective_products}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QcAuditRosterTable;

