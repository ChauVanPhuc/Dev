const doc = {
  scenarios: [
    { title: "💡 Xem góp ý cải tiến", description: "Tổng hợp ý kiến đóng góp, đề xuất cải tiến từ xưởng sản xuất.", steps: [
      { target: "ImprovementTable", action: "Xem danh sách", note: "Hiển thị tiêu đề, chi tiết, người gửi, ngày gửi và trạng thái xem xét." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Đề Xuất Cải Tiến", desc: "Tải danh sách đề xuất từ xưởng.", component: "ImprovementService", api: "GET /api/v1/improvements/", logic: "Danh sách đề xuất" },
    { step: 2, title: "Hiển Thị Bảng", desc: "Render bảng tổng hợp các ý kiến.", component: "ImprovementTable", api: "None", logic: "Client render" }
  ],
  connections: { "ImprovementTable": ["ImprovementService"], "ImprovementService": ["API GET /improvements/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
