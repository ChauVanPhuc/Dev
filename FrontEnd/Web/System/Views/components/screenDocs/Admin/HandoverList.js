const doc = {
  scenarios: [
    {
      title: "📋 Tra cứu biên bản bàn giao",
      description: "Tìm kiếm và lọc danh sách biên bản giao nhận hàng hóa giữa các công đoạn.",
      steps: [
        { target: "HandoverFilter", action: "Lọc trạng thái", note: "Chọn: Đang chờ QC, Hoàn thành, Bị lỗi QC, Bị trả về, Đang giao." },
        { target: "HandoverTable", action: "Xem danh sách", note: "Bảng hiển thị mã phiếu, KHSX, chi tiết linh kiện, số lượng giao/nhận/trả, trạng thái QC." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách Biên Bản", desc: "Gọi API tải danh sách biên bản bàn giao với phân trang.", component: "HandoverTable", api: "GET /api/v1/deliveries/", logic: "Phân trang page, size, status, search" },
    { step: 2, title: "Lọc Trạng Thái", desc: "Lọc theo trạng thái phiếu bàn giao.", component: "HandoverFilter", api: "None (Client Filter)", logic: "Filter by status" }
  ],
  connections: {
    "HandoverTable": ["HandoverFilter", "HandoverService"],
    "HandoverFilter": ["HandoverTable"],
    "HandoverService": ["API GET /deliveries/"]
  },
  codeDetails: {},
  sandboxResponses: {
    "HandoverService": {
      url: "GET /api/v1/deliveries/",
      request: { page: 1, size: 20, status: "all" },
      response: { total: 128, items: [{ id: 105, plan_code: "KHSX-2026-05", part_name: "Thanh ngang G7", qty_sent: 50, qty_received: 48, status: "Hoàn thành" }] }
    }
  }
};

export default doc;
