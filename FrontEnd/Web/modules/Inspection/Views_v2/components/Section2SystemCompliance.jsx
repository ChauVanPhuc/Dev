import React from 'react';
import QualityGauge from './QualityGauge';

export const Section2SystemCompliance = ({ complianceData }) => {
  const planTooltipData = complianceData?.planTooltip || {
    title: 'Chi tiết Kế hoạch thực hiện',
    align: 'left',
    metrics: [
      { label: 'Tổng kế hoạch', value: '20 mục' },
      { label: 'Đã hoàn thành', value: '19 (95%)', color: '#3F7D58' },
      { label: 'Đang thực hiện', value: '1 (5%)', color: '#C58A4B' }
    ],
    sections: [
      {
        title: 'Tiến độ thực hiện theo phân kỳ:',
        items: [
          '• Hoàn thành đúng hạn: 19/20 mục (95%)',
          '• Đang triển khai trong hạn: 1 mục'
        ]
      }
    ],
    footer: 'Tỷ lệ hoàn thành đúng tiến độ: 95% (Mục tiêu >= 95%)'
  };

  const inspectionRecordsTooltipData = complianceData?.recordsTooltip || {
    title: 'Chi tiết Hồ sơ kiểm tra',
    align: 'center',
    metrics: [
      { label: 'Tổng hồ sơ', value: '150 hồ sơ' },
      { label: 'Đạt chuẩn', value: '141 hồ sơ', color: '#3F7D58' },
      { label: 'Cần bổ sung', value: '9 hồ sơ', color: '#8C5332' }
    ],
    sections: [
      {
        title: 'Hồ sơ kiểm tra theo phân xưởng:',
        items: [
          '• Phân xưởng Vanity: 95% đạt chuẩn',
          '• Phân xưởng Furniture: 93% đạt chuẩn'
        ]
      },
      {
        title: 'Hạng mục lưu ý đã bổ sung:',
        items: [
          '• Cập nhật chữ ký biên bản kiểm định mộc',
          '• Bổ sung ảnh mẫu kiểm tra màu sơn hoàn thiện'
        ]
      }
    ],
    footer: 'Tỷ lệ hồ sơ kiểm tra hợp lệ: 94% (Mục tiêu >= 90%)'
  };

  const taskHandlingTooltipData = complianceData?.tasksTooltip || {
    title: 'Chi tiết Tỷ lệ xử lý công việc',
    align: 'right',
    metrics: [
      { label: 'Tổng công việc', value: '180 việc' },
      { label: 'Đã xử lý', value: '167 việc', color: '#3F7D58' },
      { label: 'Đang xử lý', value: '13 việc', color: '#C58A4B' }
    ],
    sections: [
      {
        title: 'Phân loại công việc xử lý:',
        items: [
          '• Xử lý sự cố chất lượng: 100% đúng hạn',
          '• Thao tác kiểm soát công đoạn: 93% đúng hạn',
          '• Báo cáo & phê duyệt: 92% đúng hạn'
        ]
      }
    ],
    footer: 'Tỷ lệ xử lý công việc hoàn thành: 93% (Mục tiêu >= 90%)'
  };

  const planVal = complianceData ? (complianceData.planValue ?? 0) : 95;
  const recordsVal = complianceData ? (complianceData.recordsValue ?? 0) : 94;
  const tasksVal = complianceData ? (complianceData.tasksValue ?? 0) : 93;

  return (
    <div className="qd-section-card" style={{ flex: '0 0 auto', overflow: 'visible' }}>
      <div className="qd-section-header">
        <span>2. Hiệu suất hệ thống & Tuân thủ</span>
      </div>

      <div className="qd-section-body" style={{ padding: '8px 10px', overflow: 'visible' }}>
        <div className="qd-gauges-row" style={{ overflow: 'visible' }}>
          {/* Gauge 1: Kế hoạch thực hiện */}
          <div style={{ background: '#F7F4F0', borderRadius: '6px', border: '1px solid #E4DDD5', height: '100%', position: 'relative' }}>
            <QualityGauge
              title="Kế hoạch thực hiện"
              value={planVal}
              maxValue={100}
              unit="%"
              targetText="Mục tiêu: >=95%"
              isMet={planVal >= 95}
              arcColor="#3F7D58"
              size={110}
              strokeWidth={11}
              tooltipData={planTooltipData}
            />
          </div>

          {/* Gauge 2: Hồ sơ kiểm tra */}
          <div style={{ background: '#F7F4F0', borderRadius: '6px', border: '1px solid #E4DDD5', height: '100%', position: 'relative' }}>
            <QualityGauge
              title="Hồ sơ kiểm tra"
              value={recordsVal}
              maxValue={100}
              unit="%"
              targetText="Mục tiêu: >=90%"
              isMet={recordsVal >= 90}
              arcColor="#3F7D58"
              size={110}
              strokeWidth={11}
              tooltipData={inspectionRecordsTooltipData}
            />
          </div>

          {/* Gauge 3: Tỷ lệ xử lý công việc */}
          <div style={{ background: '#F7F4F0', borderRadius: '6px', border: '1px solid #E4DDD5', height: '100%', position: 'relative' }}>
            <QualityGauge
              title="Tỷ lệ xử lý công việc"
              value={tasksVal}
              maxValue={100}
              unit="%"
              targetText="Mục tiêu: >=90%"
              isMet={tasksVal >= 90}
              arcColor="#3F7D58"
              size={110}
              strokeWidth={11}
              tooltipData={taskHandlingTooltipData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section2SystemCompliance;
