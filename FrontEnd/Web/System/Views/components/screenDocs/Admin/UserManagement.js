const doc = {
  scenarios: [
    {
      title: "👥 Tìm kiếm và quản lý nhân sự",
      description: "Tìm tài khoản theo tên hoặc mã nhân viên, lọc theo trạng thái và thực hiện thao tác nhanh.",
      steps: [
        { target: "UserSearch", action: "Nhập từ khóa", note: "Nhập mã nhân viên hoặc tên để lọc (debounce 500ms)." },
        { target: "UserFilter", action: "Lọc trạng thái", note: "Chọn: Đang sử dụng, Dừng hoạt động, Đang chờ xóa." },
        { target: "UserTable", action: "Xem kết quả", note: "Bảng hiển thị Mã NV, Họ tên, Username, Bộ phận, Vai trò, Trạng thái." },
        { target: "ActionMenu", action: "Thao tác nhanh", note: "Nhấn ⋮ để mở menu: Chỉnh sửa, Đình chỉ, Xóa tài khoản." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Tải Danh Sách Tài Khoản",
      desc: "Tải toàn bộ danh sách tài khoản kèm phân quyền từ cơ sở dữ liệu với phân trang.",
      component: "UserTable",
      api: "GET /api/v1/accounts/",
      logic: "Phân trang dữ liệu theo page, size"
    },
    {
      step: 2,
      title: "Tìm Kiếm Thời Gian Thực",
      desc: "Nhập tên hoặc mã nhân viên, hệ thống tự động lọc với cơ chế debounce 500ms.",
      component: "UserSearch",
      api: "None (Client Filter)",
      logic: "Debounce 500ms lọc danh sách"
    },
    {
      step: 3,
      title: "Lọc Theo Trạng Thái",
      desc: "Chọn dropdown trạng thái để lọc danh sách người dùng.",
      component: "UserFilter",
      api: "None (Client Filter)",
      logic: "Lọc theo: Đang sử dụng, Dừng hoạt động, Đang chờ xóa"
    },
    {
      step: 4,
      title: "Thao Tác Quản Trị",
      desc: "Mở menu thao tác nhanh trên từng dòng: Chỉnh sửa (✏️), Đình chỉ (⏸), Xóa (🗑).",
      component: "ActionMenu",
      api: "PATCH/DELETE /api/v1/accounts/{id}",
      logic: "Đóng menu khi click ngoài"
    }
  ],
  connections: {
    "UserSearch": ["UserTable"],
    "UserFilter": ["UserTable"],
    "UserTable": ["ActionMenu", "Pagination"],
    "UserCreateButton": ["Màn hình AD3.1 (Tạo người dùng mới)"],
    "ExportUserButton": ["Xuất file Excel/CSV"],
    "ActionMenu": ["API PATCH/DELETE /accounts/{id}"],
    "ActivityFeed": ["API GET /accounts/activities"],
    "Pagination": ["UserTable"]
  },
  codeDetails: {
    "UserSearch": {
      handlerName: "handleSearch",
      params: "query: string",
      processing: "Sử dụng debounce 500ms để tránh gọi API liên tục. Lọc trực tiếp trên client hoặc gọi lại API với tham số search.",
      codeSnippet: `const handleSearch = debounce((query) => {
  setSearchQuery(query);
  fetchUsers({ search: query, page: 1 });
}, 500);`
    },
    "ActionMenu": {
      handlerName: "handleAction",
      params: "userId: number, action: string",
      processing: "Xử lý các thao tác: edit → navigate, suspend → PATCH status, delete → DELETE account. Menu tự đóng khi click ngoài.",
      codeSnippet: `const handleAction = async (userId, action) => {
  switch(action) {
    case 'edit':
      navigate(\`/admin/users/edit/\${userId}\`);
      break;
    case 'suspend':
      await api.patch(\`/accounts/\${userId}\`, { status: 'suspended' });
      refreshList();
      break;
    case 'delete':
      if (confirm("Xác nhận xóa tài khoản?")) {
        await api.delete(\`/accounts/\${userId}\`);
        refreshList();
      }
      break;
  }
};`
    }
  },
  sandboxResponses: {
    "UserTable": {
      url: "GET /api/v1/accounts/",
      request: { page: 1, size: 20 },
      response: { total: 45, items: [{ id: 1, employee_code: "NV001", fullname: "Nguyễn Văn A", department: "Sản xuất", role: "Tổ trưởng" }] }
    }
  }
};

export default doc;
