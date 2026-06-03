const doc = {
  scenarios: [
    { title: "🔍 Xem chi tiết sản phẩm", description: "Xem thông tin kỹ thuật và cây cấu trúc BOM của sản phẩm.", steps: [
      { target: "ProductDetailHeader", action: "Xem thông số", note: "Kích thước, loại gỗ, bản vẽ kỹ thuật." },
      { target: "BOMViewer", action: "Xem cây BOM", note: "Danh sách phân cấp linh kiện và định mức gỗ tương ứng." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Hiển Thị Thông Tin SP", desc: "Khung thông tin chi tiết và hình ảnh kỹ thuật.", component: "ProductDetailHeader", api: "GET /api/v1/products/{id}", logic: "Hiển thị thông số kỹ thuật" },
    { step: 2, title: "Hiển Thị Cây BOM", desc: "Giao diện hiển thị cây cấu trúc định mức nguyên vật liệu.", component: "BOMViewer", api: "None", logic: "Phân cấp linh kiện & định mức" }
  ],
  connections: { "ProductDetailHeader": ["BOMViewer", "API GET /products/{id}"], "BOMViewer": ["Dữ liệu BOM từ ProductDetailHeader"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
