const doc = {
  scenarios: [
    {
      title: "✏️ Chỉnh sửa thông tin nhân sự",
      description: "Cập nhật thông tin cá nhân, bộ phận, vai trò hoặc công đoạn của nhân viên hiện tại.",
      steps: [
        { target: "UserEditForm", action: "Sửa thông tin", note: "Chỉnh sửa các trường đã điền sẵn: Mã NV, Họ tên, Username." },
        { target: "DepartmentSelector", action: "Đổi bộ phận", note: "Thay đổi bộ phận nếu cần chuyển nhân sự." },
        { target: "RoleSelector", action: "Đổi vai trò", note: "Thay đổi quyền hạn trong hệ thống." },
        { target: "StageSelector", action: "Đổi công đoạn", note: "Gán lại công đoạn sản xuất mới." },
        { target: "UserUpdateService", action: "Lưu thay đổi", note: "PUT /api/v1/accounts/{id} cập nhật thông tin." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Tải Thông Tin Hiện Tại", desc: "Tải dữ liệu tài khoản theo ID và điền sẵn vào form.", component: "UserEditForm", api: "GET /api/v1/accounts/{id}", logic: "Populate form fields" },
    { step: 2, title: "Chỉnh Sửa Thông Tin", desc: "Người dùng thay đổi các trường cần thiết.", component: "UserEditForm", api: "None", logic: "Client-side editing" },
    { step: 3, title: "Lưu Thay Đổi", desc: "Gửi dữ liệu đã chỉnh sửa lên server.", component: "UserUpdateService", api: "PUT /api/v1/accounts/{id}", logic: "Cập nhật và redirect" }
  ],
  connections: {
    "UserEditForm": ["DepartmentSelector", "RoleSelector", "StageSelector"],
    "UserUpdateService": ["API PUT /accounts/{id}"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
