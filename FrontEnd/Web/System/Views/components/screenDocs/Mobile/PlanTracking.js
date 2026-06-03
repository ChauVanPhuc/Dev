const doc = {
  scenarios: [
    { title: "📅 Theo dõi tiến độ kế hoạch", description: "Xem và giám sát tiến độ thực hiện các lệnh kế hoạch sản xuất.", steps: [
      { target: "PlanSelector", action: "Chọn KHSX", note: "Chọn KHSX hiện hành để theo dõi." },
      { target: "PlanTrackingFilter", action: "Lọc theo trạm", note: "Lọc theo trạm sản xuất đang làm việc." },
      { target: "PlanTrackingList", action: "Xem tiến độ", note: "Danh sách KHSX với thanh tiến độ (progress bar) và số lượng cụ thể." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Chọn Kế Hoạch", desc: "Chọn KHSX hiện hành để theo dõi tiến độ.", component: "PlanSelector", api: "GET /api/v1/plans/active", logic: "Dropdown KHSX" },
    { step: 2, title: "Lọc Theo Trạm", desc: "Tìm kiếm và lọc nhanh theo công đoạn hiện hành.", component: "PlanTrackingFilter", api: "None", logic: "Client filter" },
    { step: 3, title: "Hiển Thị Tiến Độ", desc: "Danh sách KHSX với progress bar và số lượng.", component: "PlanTrackingList", api: "GET /api/v1/production/plan-tracking", logic: "Thanh tiến độ hoàn thành" }
  ],
  connections: {
    "PlanSelector": ["PlanTrackingList"],
    "PlanTrackingFilter": ["PlanTrackingList"],
    "PlanTrackingList": ["PlanTrackingService"],
    "PlanTrackingService": ["API GET /production/plan-tracking"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
