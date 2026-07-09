const doc = {
  scenarios: [
    { title: "➕ Đăng ký sản phẩm mới", description: "Form đăng ký thông tin sản phẩm mới và cấu hình BOM ban đầu.", steps: [
      { target: "ProductCreateForm", action: "Điền biểu mẫu", note: "Nhập thông tin sản phẩm và cấu hình BOM. POST /api/v1/products/." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin SP", desc: "Đăng ký thông tin sản phẩm mới và BOM.", component: "ProductCreateForm", api: "POST /api/v1/products/", logic: "Tạo sản phẩm + BOM" }
  ],
  connections: { "ProductCreateForm": ["API POST /products/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
