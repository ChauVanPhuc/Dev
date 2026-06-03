const doc = {
  scenarios: [
    { title: "📦 Quản lý đơn hàng PO", description: "Xem danh sách đơn hàng sản xuất PO.", steps: [
      { target: "OrderTable", action: "Xem danh sách", note: "Hiển thị mã PO, khách hàng, sản phẩm, số lượng đặt, trạng thái sản xuất." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Đơn Hàng PO", desc: "Quản lý dữ liệu đơn hàng sản xuất.", component: "OrderTable", api: "GET /api/v1/orders/", logic: "Danh sách PO" }
  ],
  connections: { "OrderTable": ["OrderService"], "OrderService": ["API GET /orders/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
