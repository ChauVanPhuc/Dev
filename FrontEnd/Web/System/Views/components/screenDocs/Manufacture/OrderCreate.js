const doc = {
  scenarios: [
    { title: "➕ Tạo đơn hàng mới", description: "Nhập thông tin tạo mới đơn hàng PO.", steps: [
      { target: "OrderCreateForm", action: "Điền biểu mẫu", note: "Nhập mã PO, khách hàng, chọn danh sách SKU sản phẩm và số lượng." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin PO", desc: "Nhập mã PO, khách hàng, chọn SKU và số lượng.", component: "OrderCreateForm", api: "POST /api/v1/orders/", logic: "Tạo đơn hàng mới" }
  ],
  connections: { "OrderCreateForm": ["API POST /orders/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
