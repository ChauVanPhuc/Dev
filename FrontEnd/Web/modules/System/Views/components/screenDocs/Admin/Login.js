const doc = {
  scenarios: [
    {
      title: "🔑 Đăng nhập hệ thống Admin",
      description: "Thực hiện đăng nhập tài khoản quản trị để truy cập hệ thống quản lý.",
      steps: [
        { target: "LoginForm", action: "Nhập tài khoản", note: "Nhập Username và Password. Hỗ trợ ẩn/hiện mật khẩu." },
        { target: "AuthService", action: "Xác thực", note: "Hệ thống gửi thông tin đăng nhập lên server, lưu JWT token vào localStorage." }
      ]
    }
  ],
  workflows: [
    {
      step: 1,
      title: "Nhập Thông Tin Đăng Nhập",
      desc: "Người dùng nhập Username và Password vào form đăng nhập. Hệ thống validate dữ liệu client-side (kiểm tra rỗng).",
      component: "LoginForm",
      api: "None (Client Validation)",
      logic: "Kiểm tra rỗng, hiển thị/ẩn mật khẩu"
    },
    {
      step: 2,
      title: "Gửi Yêu Cầu Xác Thực",
      desc: "Gọi API đăng nhập, nhận JWT token và lưu trữ vào localStorage. Cấu hình header Authorization cho các request tiếp theo.",
      component: "AuthService",
      api: "POST /api/v1/accounts/login",
      logic: "Lưu token, cấu hình Authorization header"
    }
  ],
  connections: {
    "LoginForm": ["AuthService"],
    "AuthService": ["API POST /accounts/login", "localStorage JWT"]
  },
  codeDetails: {
    "LoginForm": {
      handlerName: "handleSubmit",
      params: "e: Event",
      processing: "Kiểm tra Username và Password không rỗng. Nếu hợp lệ, gọi AuthService để xác thực. Nếu thành công, điều hướng đến Dashboard.",
      codeSnippet: `const handleSubmit = async (e) => {
  e.preventDefault();
  if (!username || !password) {
    setError("Vui lòng nhập đầy đủ thông tin!");
    return;
  }
  try {
    const res = await authService.login(username, password);
    localStorage.setItem('token', res.data.access_token);
    navigate('/admin/dashboard');
  } catch (err) {
    setError("Sai tài khoản hoặc mật khẩu!");
  }
};`
    }
  },
  sandboxResponses: {
    "AuthService": {
      url: "POST /api/v1/accounts/login",
      request: { username: "admin", password: "****" },
      response: { success: true, access_token: "eyJhbGciOiJIUzI1NiIs...", user: { id: 1, role: "IT" } }
    }
  }
};

export default doc;
