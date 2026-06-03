const doc = {
  scenarios: [
    { title: "🏭 Giám sát hoạt động sản xuất", description: "Dashboard giám sát sản lượng ngày, tiến độ KHSX và tỷ lệ hoàn thành.", steps: [
      { target: "ManufactureDashboardOverview", action: "Xem tổng quan", note: "Hiển thị sản lượng ngày, tiến độ các KHSX hiện hành và tỷ lệ hoàn thành." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Thống Kê Sản Xuất", desc: "Lấy dữ liệu thống kê sản xuất realtime.", component: "ManufactureDashboardService", api: "GET /api/v1/manufacture/stats", logic: "Cập nhật realtime" },
    { step: 2, title: "Hiển Thị Dashboard", desc: "Dashboard giám sát hoạt động sản xuất nhà máy.", component: "ManufactureDashboardOverview", api: "None", logic: "Render biểu đồ sản lượng" }
  ],
  connections: { "ManufactureDashboardOverview": ["ManufactureDashboardService"], "ManufactureDashboardService": ["API GET /manufacture/stats"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
