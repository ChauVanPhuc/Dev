const doc = {
  scenarios: [
    { title: "⚠️ Giám sát điểm nóng rủi ro", description: "Tổng hợp các điểm nóng rủi ro cao vượt ngưỡng an toàn.", steps: [
      { target: "HotspotTable", action: "Xem cảnh báo", note: "Cảnh báo lỗi QC hoặc thiết bị hư hỏng lặp lại nhiều lần trong tuần." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Cảnh Báo Rủi Ro", desc: "Lấy danh sách điểm nóng từ hệ thống.", component: "HotspotService", api: "GET /api/v1/dashboard/hotspots", logic: "Phát hiện vượt ngưỡng" },
    { step: 2, title: "Hiển Thị Bảng", desc: "Bảng tổng hợp rủi ro với màu sắc cảnh báo.", component: "HotspotTable", api: "None", logic: "Highlight ngưỡng đỏ/vàng" }
  ],
  connections: { "HotspotTable": ["HotspotService"], "HotspotService": ["API GET /dashboard/hotspots"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
