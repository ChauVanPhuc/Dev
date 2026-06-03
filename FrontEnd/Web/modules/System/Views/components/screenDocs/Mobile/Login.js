const doc = {
  scenarios: [
    { title: "🔑 Đăng nhập Mobile", description: "Đăng nhập ứng dụng trên thiết bị di động.", steps: [
      { target: "MobileLoginForm", action: "Nhập thông tin", note: "Nhập mã nhân viên và mật khẩu. Định dạng chuẩn OAuth2." },
      { target: "PushNotificationsRegister", action: "Đăng ký FCM", note: "Đăng ký và đồng bộ FCM token lên máy chủ sau đăng nhập thành công." }
    ]}
  ],
  workflows: [
    { step: 1, title: "Nhập Thông Tin Đăng Nhập", desc: "Nhập thông tin và đăng nhập. Form chuẩn OAuth2.", component: "MobileLoginForm", api: "POST /api/v1/accounts/login", logic: "Xác thực & lưu token" },
    { step: 2, title: "Đăng Ký Thông Báo Đẩy", desc: "Sử dụng Firebase SDK để lấy device token và gọi API đồng bộ.", component: "PushNotificationsRegister", api: "POST /api/v1/accounts/update-fcm-token", logic: "Firebase SDK lấy FCM token" }
  ],
  connections: {
    "MobileLoginForm": ["PushNotificationsRegister", "API POST /accounts/login"],
    "PushNotificationsRegister": ["Firebase SDK", "API POST /accounts/update-fcm-token"]
  },
  codeDetails: {},
  sandboxResponses: {}
};

export default doc;
