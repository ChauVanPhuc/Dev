const doc = {
  scenarios: [
    {
      title: "➕ Tạo tài khoản nhân sự mới",
      description: "Điền thông tin cá nhân, phân bộ phận, vai trò và công đoạn làm việc cho nhân sự mới.",
      steps: [
        { target: "UserCreateForm", action: "Nhập thông tin", note: "Nhập Mã NV, Họ tên, Username, Mật khẩu. Validate độ dài và ký tự." },
        { target: "DepartmentSelector", action: "Chọn bộ phận", note: "Chọn: Sản xuất, QC, Hành chính, Ban giám đốc." },
        { target: "RoleSelector", action: "Phân quyền", note: "Chọn vai trò: IT, BGD, Tổ trưởng, Nhân viên, QC." },
        { target: "StageSelector", action: "Gán công đoạn", note: "Chỉ kích hoạt khi chọn bộ phận Sản xuất. Lấy danh sách từ database." },
        { target: "UserCreateService", action: "Gửi tạo", note: "POST /api/v1/accounts/ với JSON payload." }
      ]
    }
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin Cá Nhân", desc: "Điền mã nhân viên, họ tên, tên đăng nhập và mật khẩu mới.", component: "UserCreateForm", api: "None (Client)", logic: "Validate client-side" },
    { step: 2, title: "Chọn Bộ Phận", desc: "Lựa chọn bộ phận: Sản xuất, QC, Hành chính, Ban giám đốc.", component: "DepartmentSelector", api: "None", logic: "Kích hoạt StageSelector nếu chọn SX" },
    { step: 3, title: "Phân Quyền Vai Trò", desc: "Gán vai trò hệ thống cho tài khoản mới.", component: "RoleSelector", api: "None", logic: "IT, BGD, Tổ trưởng, Nhân viên, QC" },
    { step: 4, title: "Gán Công Đoạn", desc: "Chọn công đoạn sản xuất cụ thể (chỉ khi bộ phận = Sản xuất).", component: "StageSelector", api: "GET /api/v1/stages", logic: "Tải danh sách công đoạn từ DB" },
    { step: 5, title: "Gửi Yêu Cầu Tạo", desc: "Đóng gói và gửi thông tin tài khoản mới lên server.", component: "UserCreateService", api: "POST /api/v1/accounts/", logic: "Tạo tài khoản và redirect" }
  ],
  connections: {
    "UserCreateForm": ["DepartmentSelector", "RoleSelector", "StageSelector"],
    "DepartmentSelector": ["StageSelector"],
    "UserCreateService": ["API POST /accounts/"]
  },
  codeDetails: {
    "UserCreateService": {
      handlerName: "handleCreateUser",
      params: "formData: object",
      processing: "Gửi POST /api/v1/accounts/ với JSON payload chứa thông tin tài khoản. Nếu thành công, redirect về danh sách.",
      codeSnippet: `const handleCreateUser = async (formData) => {
  try {
    await api.post('/accounts/', formData);
    showToast("Tạo tài khoản thành công!");
    navigate('/admin/users');
  } catch (err) {
    setError(err.response?.data?.detail || "Lỗi tạo tài khoản");
  }
};`
    }
  },
  sandboxResponses: {
    "UserCreateService": {
      url: "POST /api/v1/accounts/",
      request: { employee_code: "NV046", fullname: "Trần Văn B", username: "tranvanb", password: "****", department: "Sản xuất", role: "Nhân viên", stage_id: 3 },
      response: { success: true, id: 46, message: "Tạo tài khoản thành công" }
    }
  }
};

export default doc;
