const doc = {
  scenarios: [
    { title: "🔍 Xem chi tiết kế hoạch", description: "Xem thông tin tổng hợp và tiến độ BOM/linh kiện của KHSX.", steps: [
      { target: "PlanDetailHeader", action: "Xem tổng quan", note: "Tên kế hoạch, ngày lập, tiến độ tổng quan và thông số sản phẩm." },
      { target: "PlanDetailTable", action: "Xem BOM chi tiết", note: "Mã linh kiện, số lượng cần giao, đã giao và tiến độ từng trạm." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Chi Tiết KHSX", desc: "Tải thông tin chi tiết KHSX bao gồm tiến độ các công đoạn.", component: "PlanDetailService", api: "GET /api/v1/plans/{id}", logic: "Load BOM & tiến độ" },
    { step: 2, title: "Hiển Thị Header", desc: "Render khung thông tin tổng hợp.", component: "PlanDetailHeader", api: "None", logic: "Hiển thị tên, ngày, tiến độ" },
    { step: 3, title: "Hiển Thị Bảng BOM", desc: "Bảng tiến độ chi tiết từng linh kiện.", component: "PlanDetailTable", api: "None", logic: "Tính toán % hoàn thành" }
  ],
  connections: { "PlanDetailHeader": ["PlanDetailService"], "PlanDetailTable": ["PlanDetailService"], "PlanDetailService": ["API GET /plans/{id}"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
