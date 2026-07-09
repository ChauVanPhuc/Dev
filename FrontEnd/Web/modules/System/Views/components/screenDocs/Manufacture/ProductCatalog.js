const doc = {
  scenarios: [
    { title: "📁 Tra cứu danh mục sản phẩm", description: "Xem danh sách SKU, tên sản phẩm, kích thước và phân nhóm gỗ.", steps: [
      { target: "ProductTable", action: "Xem danh mục", note: "Hiển thị SKU, tên sản phẩm, kích thước tiêu chuẩn, phân nhóm gỗ." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Danh Mục", desc: "Quản lý danh sách và thông tin sản phẩm.", component: "ProductTable", api: "GET /api/v1/products/", logic: "Danh sách sản phẩm" }
  ],
  connections: { "ProductTable": ["ProductService"], "ProductService": ["API GET /products/"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
