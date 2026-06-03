const doc = {
  scenarios: [
    {
      title: "📊 Tra cứu báo cáo kiểm tra chất lượng",
      description: "Xem thống kê kết quả kiểm tra QC định kỳ theo công đoạn và thời gian.",
      steps: [
        { target: "InspectionReportFilter", action: "Chọn bộ lọc", note: "Chọn khoảng thời gian (từ ngày - đến ngày) và công đoạn sản xuất." },
        { target: "InspectionReportTable", action: "Xem kết quả", note: "Bảng hiển thị tổng mẫu, số đạt, số lỗi và tỷ lệ đạt theo từng công đoạn." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Chọn Bộ Lọc Thời Gian", desc: "Chọn khoảng thời gian và công đoạn sản xuất cần xem.", component: "InspectionReportFilter", api: "None", logic: "Filter thời gian & công đoạn" },
    { step: 2, title: "Hiển Thị Báo Cáo", desc: "Bảng thống kê tổng số mẫu, số đạt, số lỗi và tỷ lệ đạt chất lượng.", component: "InspectionReportTable", api: "GET /api/v1/inspections/reports", logic: "Tổng hợp theo công đoạn" }
  ],
  connections: {
    "InspectionReportFilter": ["InspectionReportTable"],
    "InspectionReportTable": ["API GET /inspections/reports"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
