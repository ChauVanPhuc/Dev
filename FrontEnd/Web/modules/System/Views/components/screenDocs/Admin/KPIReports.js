const doc = {
  scenarios: [
    {
      title: "📈 Xem báo cáo KPI nhân sự",
      description: "Xem bảng xếp hạng và thống kê điểm số KPI của nhân viên theo tháng.",
      steps: [
        { target: "KPIReportTable", action: "Xem bảng KPI", note: "Hiển thị mã NV, họ tên, công đoạn, điểm năng suất, kỷ luật và tổng điểm xếp loại." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Tải Báo Cáo KPI", desc: "Tải báo cáo thống kê KPI nhân sự. Hỗ trợ lọc theo tháng và phòng ban.", component: "KPIReportService", api: "GET /api/v1/kpis/reports", logic: "Lọc theo tháng, phòng ban" },
    { step: 2, title: "Hiển Thị Bảng Xếp Hạng", desc: "Render bảng KPI với mã nhân viên, điểm số và xếp loại.", component: "KPIReportTable", api: "None (Client Render)", logic: "Sắp xếp theo tổng điểm" }
  ],
  connections: {
    "KPIReportTable": ["KPIReportService"],
    "KPIReportService": ["API GET /kpis/reports"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
