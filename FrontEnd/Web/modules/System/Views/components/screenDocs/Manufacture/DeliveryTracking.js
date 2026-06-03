const doc = {
  scenarios: [
    { title: "🚚 Theo dõi giao hàng", description: "Bảng theo dõi hoạt động giao nhận hàng hóa giữa các tổ sản xuất.", steps: [
      { target: "DeliveryTrackingTable", action: "Xem lịch sử", note: "Hiển thị lịch sử các lần chuyển giao, người giao, người nhận, thời gian." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Lịch Sử Giao Hàng", desc: "Bảng theo dõi hoạt động giao nhận.", component: "DeliveryTrackingTable", api: "GET /api/v1/deliveries/tracking", logic: "Lịch sử giao nhận" }
  ],
  connections: { "DeliveryTrackingTable": ["API GET /deliveries/tracking"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
