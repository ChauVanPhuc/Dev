const doc = {
  scenarios: [
    { title: "📦 Quản lý dữ liệu đóng gói", description: "Quản lý danh sách gói dữ liệu xuất xưởng và đồng bộ QR.", steps: [
      { target: "DataPackagingTable", action: "Xem danh sách", note: "Hiển thị mã gói, số lượng thẻ QR đi kèm, trạng thái đồng bộ và ngày tạo." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Tải Danh Sách Gói Dữ Liệu", desc: "Quản lý danh sách gói dữ liệu xuất xưởng.", component: "DataPackagingTable", api: "GET /api/v1/data/sync-status", logic: "Kiểm tra đồng bộ" },
    { step: 2, title: "Đóng Gói Dữ Liệu", desc: "Thực hiện đóng gói và đồng bộ dữ liệu.", component: "DataPackagingService", api: "POST /api/v1/data/package", logic: "Đóng gói và đồng bộ" }
  ],
  connections: { "DataPackagingTable": ["DataPackagingService"], "DataPackagingService": ["API POST /data/package", "API GET /data/sync-status"] },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
