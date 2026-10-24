/* ==============================================================
   SMARTFLOW ERP V3 - QUALITY INFOGRAPHIC CHART INITIALIZER
   Initializes Chart.js with exact styling, colors, and direct data labels
   ============================================================== */

window.initInfographicCharts = function(data) {
  if (!window.Chart) {
    console.error("Chart.js not loaded!");
    return;
  }

  // Common typography & tooltip options
  Chart.defaults.font.family = "'Segoe UI', 'Montserrat', sans-serif";
  Chart.defaults.font.size = 8;
  Chart.defaults.color = "#64748B";

  // 1. CHART 1: SO SÁNH CÁC CHỈ SỐ VẬN HÀNH (Grouped Bar Chart)
  const ctx1 = document.getElementById('chartOperating');
  if (ctx1) {
    const rawCurr = data.kpis.raw_curr;
    const rawPrev = data.kpis.raw_prev;

    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Tổng phiếu kiểm', 'Tổng lỗi phát hiện', 'Sản phẩm lỗi'],
        datasets: [
          {
            label: data.metadata.prev_period_str.split(' ')[0] + ' ' + (data.metadata.prev_period_str.split(' ')[1] || ''),
            data: [
              rawPrev.total,
              rawPrev.daily_defects,
              rawPrev.error_qty
            ],
            backgroundColor: '#3B82F6',
            borderRadius: 3,
            barPercentage: 0.65
          },
          {
            label: data.metadata.curr_period_str.split(' ')[0] + ' ' + (data.metadata.curr_period_str.split(' ')[1] || ''),
            data: [
              rawCurr.total,
              rawCurr.daily_defects,
              rawCurr.error_qty
            ],
            backgroundColor: '#F59E0B',
            borderRadius: 3,
            barPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 14 }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 8, font: { size: 8 } }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#F8FAFC' },
            ticks: { font: { size: 7.5 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 7.2 } }
          }
        }
      },
      plugins: [{
        id: 'operatingLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          ctx.font = 'bold 7.5px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          chart.data.datasets.forEach((dataset, dIdx) => {
            const meta = chart.getDatasetMeta(dIdx);
            if (meta.hidden) return;

            meta.data.forEach((bar, i) => {
              const val = dataset.data[i];
              if (val === undefined || val === null) return;
              ctx.fillStyle = dIdx === 0 ? '#1D4ED8' : '#B45309';
              ctx.fillText(val, bar.x, bar.y - 2);
            });
          });
          ctx.restore();
        }
      }]
    });
  }

  // 2. CHART 2: TOP LỖI KỸ THUẬT PHÁT SINH (Horizontal Bar with Data Labels)
  const ctx2 = document.getElementById('chartTopDefects');
  if (ctx2) {
    const topDefects = (data.defects || []).slice(0, 4);
    const labels = topDefects.map(d => d.name);
    const values = topDefects.map(d => d.curr_qty);
    const shares = topDefects.map(d => d.share_pct);
    const maxVal = Math.max(...values, 10);

    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: ['#EF4444', '#F97316', '#3B82F6', '#0284C7'],
          borderRadius: 3,
          barPercentage: 0.65
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 46 }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: Math.round(maxVal * 1.3),
            grid: { color: '#F8FAFC' },
            ticks: { font: { size: 7.5 } }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 7.5 } }
          }
        }
      },
      plugins: [{
        id: 'topDefectLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          ctx.font = 'bold 7px "Segoe UI", sans-serif';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((bar, i) => {
            const val = values[i];
            const pct = shares[i] ? ` (${shares[i]}%)` : '';
            ctx.fillStyle = '#1E293B';
            ctx.fillText(val + pct, bar.x + 3, bar.y);
          });
          ctx.restore();
        }
      }]
    });
  }

  // 3. CHART 3: PHÂN BỐ LỖI THEO CÔNG ĐOẠN (Vertical Column Chart with Value Tags)
  const ctx3 = document.getElementById('chartStageDist');
  if (ctx3) {
    const matrixStages = data.matrix.stages || ['Định Hình', 'Lắp Ráp', 'Sơn', 'Đóng Gói', 'Final'];
    const matrixTotals = matrixStages.map(s => data.matrix.stage_totals[s] || 0);

    new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: matrixStages,
        datasets: [{
          data: matrixTotals,
          backgroundColor: matrixStages.map(s => s === 'Sơn' ? '#EF4444' : '#3B82F6'),
          borderRadius: 3,
          barPercentage: 0.55
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 14 }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#F8FAFC' },
            ticks: { font: { size: 7.5 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 7.5 } }
          }
        }
      },
      plugins: [{
        id: 'stageDistLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          ctx.font = 'bold 7.5px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((bar, i) => {
            const val = matrixTotals[i];
            const stageName = matrixStages[i];
            ctx.fillStyle = stageName === 'Sơn' ? '#DC2626' : '#1E293B';
            ctx.fillText(val, bar.x, bar.y - 2);
          });
          ctx.restore();
        }
      }]
    });
  }

  // 4. CHART 4: TỶ LỆ ĐẠT THEO CÔNG ĐOẠN (Horizontal Progress / Bar with Percent Labels)
  const ctx4 = document.getElementById('chartStagePass');
  if (ctx4) {
    const stages = data.stages || [];
    const labels = stages.map(s => s.stage);
    const passRates = stages.map(s => s.curr_pass_rate);

    new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: passRates,
          backgroundColor: passRates.map(v => v >= 90 ? '#10B981' : (v >= 60 ? '#F59E0B' : '#EF4444')),
          borderRadius: 3,
          barPercentage: 0.6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 28 }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: '#F8FAFC' },
            ticks: { callback: v => v + '%', font: { size: 7.5 } }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 7.5 } }
          }
        }
      },
      plugins: [{
        id: 'stagePassLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save();
          ctx.font = 'bold 7.5px "Segoe UI", sans-serif';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          const meta = chart.getDatasetMeta(0);
          meta.data.forEach((bar, i) => {
            const val = passRates[i];
            ctx.fillStyle = val >= 90 ? '#059669' : (val >= 60 ? '#D97706' : '#DC2626');
            ctx.fillText(val + '%', bar.x + 3, bar.y);
          });
          ctx.restore();
        }
      }]
    });
  }
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  try {
    const dataElem = document.getElementById('reportData');
    if (dataElem) {
      const data = JSON.parse(dataElem.textContent);
      window.initInfographicCharts(data);
    }
  } catch (e) {
    console.error("Lỗi parse dữ liệu báo cáo:", e);
  }
});

// Download high-resolution PNG
window.exportToImage = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const reportType = urlParams.get('type') || 'weekly';
  const reportParam = urlParams.get('param') || '42';
  window.location.href = `/export/image?type=${reportType}&param=${reportParam}`;
};
