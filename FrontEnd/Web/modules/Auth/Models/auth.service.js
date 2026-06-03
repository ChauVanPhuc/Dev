import api from '@webShared/Services/api.service';



/**

 * Model: Xử lý xác thực người dùng

 */

export const authService = {

  // Đăng nhập

  login: async (username, password) => {

    // FastAPI OAuth2 sử dụng Form Data thay vì JSON

    const formData = new URLSearchParams();

    formData.append('username', username);

    formData.append('password', password);



    return await api.post('/accounts/login', formData, {

      headers: {

        'Content-Type': 'application/x-www-form-urlencoded'

      }

    });

  },



  // Đăng xuất

  logout: () => {

    localStorage.removeItem('token');

  },



  // Lưu token

  setToken: (token) => {

    localStorage.setItem('token', token);

  },



  // Lấy token

  getToken: () => {

    return localStorage.getItem('token');

  }

};

