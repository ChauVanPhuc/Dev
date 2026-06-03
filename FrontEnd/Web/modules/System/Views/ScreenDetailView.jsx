import React, { useState, useEffect } from 'react';

import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

import { screenService } from '@modules/System/Models/screen.service';

import ScreenSimulator from '@modules/System/Views/components/ScreenSimulation';

import SCREEN_DOCS from './components/screenDocs';

import '@web/styles/Admin/ScreenDetail.css';



// Hàm chuẩn hóa tên màn hình thành slug để so khớp tài liệu

const normalizeTitle = (title) => {

  if (!title) return '';

  return title

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '') // Khử dấu

    .replace(/[đĐ]/g, 'd')

    .replace(/[^a-zA-Z0-9]/g, '')   // Xóa khoảng trắng & ký tự đặc biệt

    .toLowerCase();

};



// Cấu trúc hiển thị thông tin kỹ thuật (hỗ trợ cả text thường và JSON AST)

const renderTechnicalDetails = (technicalDetails) => {

  if (!technicalDetails) {

    return <span className="text-gray-400 italic">Chưa cập nhật.</span>;

  }



  let processedDetails = technicalDetails

    .replace(/\\u000e0/g, '\\u00e0')

    .replace(/\\u000e/g, '')

    .replace(/\u000e0/g, 'à')

    .replace(/\u000e/g, '');



  try {

    const trimmed = processedDetails.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {

      const parsed = JSON.parse(trimmed);

      

      const fixUnicodeChars = (str) => {

        if (typeof str !== 'string') return str;

        return str.replace(/\u000e0/g, 'à').replace(/\u000e/g, '');

      };



      const handlerName = fixUnicodeChars(parsed.handler_name);

      const detailsText = fixUnicodeChars(parsed.details);

      const calledApis = parsed.called_apis || [];

      const codeSnippet = parsed.code_snippet;



      return (

        <div className="technical-json-details font-sans" style={{ textAlign: 'left', lineHeight: '1.5' }}>

          {handlerName && (

            <div className="tech-item" style={{ marginBottom: '8px' }}>

              <span style={{ fontWeight: '600', color: '#7B5233', fontSize: '0.85rem' }}>Tên hàm xử lý:</span>{' '}

              <code className="tech-code font-mono" style={{ 

                background: '#F5E6D3', 

                color: '#4A2E20', 

                padding: '2px 6px', 

                borderRadius: 4, 

                fontSize: '0.8rem' 

              }}>{handlerName}</code>

            </div>

          )}

          {detailsText && (

            <div className="tech-item" style={{ marginBottom: '8px' }}>

              <span style={{ fontWeight: '600', color: '#7B5233', fontSize: '0.85rem' }}>Mô tả nghiệp vụ:</span>{' '}

              <span className="tech-text" style={{ color: '#4A2E20', fontSize: '0.85rem' }}>{detailsText}</span>

            </div>

          )}

          {calledApis && calledApis.length > 0 && (

            <div className="tech-item" style={{ marginBottom: '8px' }}>

              <span style={{ fontWeight: '600', color: '#7B5233', fontSize: '0.85rem' }}>APIs gọi xuống:</span>

              <ul className="tech-api-list" style={{ margin: '4px 0 0 16px', padding: 0 }}>

                {calledApis.map((api, aIdx) => (

                  <li key={aIdx} style={{ listStyleType: 'disc', color: '#4A2E20', fontSize: '0.85rem' }}>

                    <code className="tech-code font-mono" style={{ 

                      background: '#F5E6D3', 

                      color: '#4A2E20', 

                      padding: '1px 4px', 

                      borderRadius: 3, 

                      fontSize: '0.75rem' 

                    }}>{fixUnicodeChars(api)}</code>

                  </li>

                ))}

              </ul>

            </div>

          )}

          {codeSnippet && (

            <div className="tech-item" style={{ marginTop: '12px' }}>

              <span style={{ fontWeight: '600', color: '#7B5233', fontSize: '0.85rem' }}>Mã nguồn xử lý:</span>

              <pre className="tech-code-snippet font-mono" style={{ 

                background: '#1E1E1E', 

                color: '#A9B7C6', 

                padding: '10px 12px', 

                borderRadius: 6, 

                fontSize: '0.75rem', 

                overflowX: 'auto', 

                marginTop: 6, 

                fontFamily: 'monospace',

                textAlign: 'left',

                borderLeft: '3px solid #7B5233'

              }}>

                <code>{codeSnippet}</code>

              </pre>

            </div>

          )}

        </div>

      );

    }

  } catch (e) {

    console.error("Failed to parse technical details as JSON:", e);

  }



  const cleanText = processedDetails

    .replace(/\u000e0/g, 'à')

    .replace(/\u000e/g, '');

    

  return cleanText.split('\n').map((line, idx) => (

    <div key={idx}>{line}</div>

  ));

};



// Hàm sinh tự động luồng workflow cho các màn hình khác

const getWorkflowForScreen = (screen, components = []) => {

  if (!screen) return [];

  const docKey = normalizeTitle(screen.title);

  const platform = screen.platform || 'Web';

  const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

  if (doc && doc.workflows && doc.workflows.length > 0) return doc.workflows;

  

  const uiComps = components.filter(c => c.type === 'UI Component' && c.name !== 'UserGuideButton' && c.name !== 'NotificationBell');

  const logicComps = components.filter(c => c.type === 'Logic / Service' || c.type === 'Business Logic');

  const apiComps = components.filter(c => c.type === 'API Endpoint' || c.type === 'Native API');



  const steps = [];

  let stepNum = 1;



  steps.push({

    step: stepNum++,

    title: "Mở giao diện vận hành",

    desc: "Khởi chạy ứng dụng và hiển thị màn hình làm việc.",

    component: "UserGuideButton",

    api: "None",

    logic: "Hiển thị hướng dẫn"

  });



  if (uiComps.length > 0) {

    steps.push({

      step: stepNum++,

      title: `Thao tác: ${uiComps[0].name}`,

      desc: uiComps[0].description || `Người dùng thao tác và điền thông tin vào ${uiComps[0].name}.`,

      component: uiComps[0].name,

      api: apiComps[0]?.name || "None",

      logic: "Xử lý tương tác"

    });

  }



  if (logicComps.length > 0) {

    steps.push({

      step: stepNum++,

      title: `Xử lý: ${logicComps[0].name}`,

      desc: logicComps[0].description || "Tính toán logic nghiệp vụ, đối chiếu dữ liệu cục bộ.",

      component: logicComps[0].name,

      api: apiComps[1]?.name || "None",

      logic: "Kiểm tra quy tắc"

    });

  }



  const submitComp = components.find(c => c.name.toLowerCase().includes('button') || c.name.toLowerCase().includes('submit') || c.name.toLowerCase().includes('save'));

  if (submitComp && submitComp.name !== uiComps[0]?.name) {

    steps.push({

      step: stepNum++,

      title: `Gửi kết quả: ${submitComp.name}`,

      desc: submitComp.description || "Gửi yêu cầu lưu trữ và hoàn tất quy trình nghiệp vụ.",

      component: submitComp.name,

      api: apiComps[apiComps.length - 1]?.name || "API Endpoint",

      logic: "Ghi nhận database"

    });

  }



  return steps;

};



// Ánh xạ liên kết nghiệp vụ kỹ thuật giữa các component

const getConnections = (screen, compName) => {

  if (!screen) return ["Hệ thống quản lý chung"];

  const docKey = normalizeTitle(screen.title);

  const platform = screen.platform || 'Web';

  const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

  if (doc && doc.connections && doc.connections[compName]) {

    return doc.connections[compName];

  }

  // Fallback to checking other screen docs

  for (const plat in SCREEN_DOCS) {

    for (const key in SCREEN_DOCS[plat]) {

      const otherDoc = SCREEN_DOCS[plat][key];

      if (otherDoc && otherDoc.connections && otherDoc.connections[compName]) {

        return otherDoc.connections[compName];

      }

    }

  }

  return ["Hệ thống quản lý chung"];

};



// Hàm chi tiết hóa code JavaScript và giải thuật xử lý cho từng component

const getComponentCodeDetails = (screen, compName) => {

  if (!screen) return { handlerName: `handle${compName}Action`, params: "event: any", processing: "", codeSnippet: "" };

  const docKey = normalizeTitle(screen.title);

  const platform = screen.platform || 'Web';

  const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

  if (doc && doc.codeDetails && doc.codeDetails[compName]) {

    return doc.codeDetails[compName];

  }

  // Fallback to checking other screen docs

  for (const plat in SCREEN_DOCS) {

    for (const key in SCREEN_DOCS[plat]) {

      const otherDoc = SCREEN_DOCS[plat][key];

      if (otherDoc && otherDoc.codeDetails && otherDoc.codeDetails[compName]) {

        return otherDoc.codeDetails[compName];

      }

    }

  }



  return {

    handlerName: `handle${compName}Action`,

    params: "event: any",

    processing: `Hàm xử lý logic nghiệp vụ chính của thành phần ${compName}. Ghi nhận các thao tác chạm/click của người dùng trên thiết bị di động.`,

    codeSnippet: `const handle${compName}Action = async (event) => {

  console.log("Triggered action for ${compName}");

  try {

    // Thực hiện logic xử lý nghiệp vụ...

    const result = await api.post('/components/${compName.toLowerCase()}/action');

    if (result.status === 200) {

      updateComponentState();

    }

  } catch (error) {

    console.error("Error executing ${compName} handler:", error);

  }

};`

  };

};



// Tạo dữ liệu log sandbox API tương ứng

const getSandboxResponse = (screen, compName) => {

  if (!screen) return { url: "", request: {}, response: {} };



  // Try to find component object in database configuration first

  const comp = screen.components.find(c => c.name === compName);

  if (comp && comp.technical_details && comp.technical_details.trim().startsWith('{')) {

    try {

      let jsonStr = comp.technical_details

        .replace(/\\u000e0/g, '\\u00e0')

        .replace(/\\u000e/g, '')

        .replace(/\u000e0/g, 'à')

        .replace(/\u000e/g, '');

      const parsed = JSON.parse(jsonStr);

      if (parsed) {

        let url = `CALL service_api.${compName}()`;

        if (parsed.called_apis && parsed.called_apis.length > 0) {

          url = parsed.called_apis[0];

        }

        return {

          url: url,

          request: parsed.request_payload || { action: "trigger_component" },

          response: parsed.response_payload || { success: true, message: `Simulated event for ${compName} executed successfully.` }

        };

      }

    } catch (e) {

      console.error("Failed to parse sandbox response from DB:", e);

    }

  }



  const docKey = normalizeTitle(screen.title);

  const platform = screen.platform || 'Web';

  const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

  if (doc && doc.sandboxResponses && doc.sandboxResponses[compName]) {

    return { ...doc.sandboxResponses[compName] };

  }

  // Fallback to checking other screen docs

  for (const plat in SCREEN_DOCS) {

    for (const key in SCREEN_DOCS[plat]) {

      const otherDoc = SCREEN_DOCS[plat][key];

      if (otherDoc && otherDoc.sandboxResponses && otherDoc.sandboxResponses[compName]) {

        return { ...otherDoc.sandboxResponses[compName] };

      }

    }

  }



  // General fallback

  if (compName === "SubmitDeliveryButton") {

    return {

      url: "POST /api/v1/deliveries/",

      request: { plan_id: 2, part_name: "Ván cửa", quantity: 300, moisture: [11.2, 11.5, 11.0] },

      response: { success: true, delivery_id: 105, created_at: "2026-05-27T09:05:00" }

    };

  }



  return {

    url: `CALL service_api.${compName}()`,

    request: { action: "trigger_component" },

    response: { success: true, message: `Simulated event for ${compName} executed successfully.` }

  };

};



// Phân tích tác động DB động

const getDatabaseOperations = (comp, dbTables) => {

  if (!comp) return [];

  const tables = dbTables && dbTables.length > 0 ? dbTables : ['system_components'];

  const name = (comp.name || '').toLowerCase();

  const desc = (comp.description || '').toLowerCase();

  

  return tables.map(table => {

    let action = 'Đọc (SELECT)';

    let impact = `Truy vấn dữ liệu liên quan từ bảng ${table}.`;

    

    if (name.includes('create') || name.includes('add') || desc.includes('tạo') || desc.includes('thêm')) {

      action = 'Ghi (INSERT)';

      impact = `Thêm bản ghi mới vào bảng ${table} khi biểu mẫu được gửi thành công.`;

    } else if (name.includes('update') || name.includes('edit') || name.includes('submit') || desc.includes('cập nhật') || desc.includes('sửa')) {

      action = 'Cập nhật (UPDATE)';

      impact = `Cập nhật trạng thái hoặc thông tin bản ghi hiện tại trong bảng ${table}.`;

    } else if (name.includes('delete') || name.includes('remove') || desc.includes('xóa')) {

      action = 'Xóa (DELETE)';

      impact = `Xóa dữ liệu hoặc vô hiệu hóa bản ghi trong bảng ${table}.`;

    }

    

    return { table, action, impact };

  });

};



// Định nghĩa tham số API động

const getApiDocumentation = (apiItem) => {

  const parts = apiItem.split(' ');

  const method = parts[0] || 'GET';

  const path = parts[1] || apiItem;

  

  let params = [];

  if (method === 'GET') {

    params = [

      { name: 'limit', type: 'number', required: 'Không', desc: 'Số lượng bản ghi tối đa trả về (mặc định: 10).' },

      { name: 'page', type: 'number', required: 'Không', desc: 'Số trang dữ liệu hiện tại.' },

      { name: 'search', type: 'string', required: 'Không', desc: 'Từ khóa tìm kiếm lọc dữ liệu.' }

    ];

  } else {

    params = [

      { name: 'updated_by', type: 'string', required: 'Có', desc: 'Tên tài khoản người thực hiện thay đổi.' },

      { name: 'payload', type: 'object', required: 'Có', desc: 'Dữ liệu cập nhật chi tiết dạng key-value.' }

    ];

  }

  

  return { method, path, params };

};



// Hàm suy luận các phần tử con bên trong mỗi component dựa vào tên và loại

const getComponentSubElements = (comp) => {

  if (!comp) return [];

  const name = (comp.name || '').toLowerCase();

  const type = comp.type || '';

  const desc = (comp.description || '').toLowerCase();

  const tech = (comp.technical_details || '').toLowerCase();

  const all = name + ' ' + desc + ' ' + tech;

  const compName = comp.name || 'Component';



  // Logic / Service / API

  if (type === 'Logic / Service' || type === 'Business Logic') {

    const els = [];

    if (all.includes('auth') || all.includes('login') || all.includes('token')) {

      els.push({ icon: '🔑', label: 'Xác thực Token', desc: 'Gửi credentials lên server, nhận JWT token về lưu trữ.', handler: 'authService.login(username, password)' });

      els.push({ icon: '📡', label: 'API Request', desc: 'Gọi endpoint xác thực, gắn token vào header Authorization.', handler: 'axios.post("/accounts/login", data)' });

      els.push({ icon: '💾', label: 'localStorage', desc: 'Lưu token vào localStorage để duy trì phiên đăng nhập.', handler: 'localStorage.setItem("token", token)' });

    } else if (all.includes('filter') || all.includes('search') || all.includes('debounce')) {

      els.push({ icon: '⚙️', label: 'Debounce Logic', desc: 'Trì hoãn gọi API khi người dùng gõ liên tục, tránh quá tải.', handler: 'debounce(callback, 500)' });

      els.push({ icon: '🔄', label: 'State Update', desc: 'Cập nhật state React để render lại danh sách đã lọc.', handler: 'setFilteredData(result)' });

    } else {

      els.push({ icon: '⚙️', label: 'Hàm xử lý', desc: 'Xử lý logic nghiệp vụ chính của service.', handler: `handle${compName}Action(event)` });

      els.push({ icon: '📡', label: 'API Call', desc: 'Gọi API backend để lấy hoặc cập nhật dữ liệu.', handler: `api.request("/${compName.toLowerCase()}")` });

    }

    return els;

  }



  if (type === 'API Endpoint' || type === 'Native API') {

    const els = [{ icon: '🌐', label: 'HTTP Endpoint', desc: 'Điểm truy cập API trên server backend.', handler: 'FastAPI router endpoint' }];

    if (all.includes('get')) els.push({ icon: '📥', label: 'GET Request', desc: 'Lấy dữ liệu từ server, trả về JSON.', handler: 'GET /api/v1/...' });

    if (all.includes('post')) els.push({ icon: '📤', label: 'POST Request', desc: 'Gửi dữ liệu mới lên server để tạo bản ghi.', handler: 'POST /api/v1/...' });

    if (all.includes('patch') || all.includes('put')) els.push({ icon: '✏️', label: 'PATCH/PUT', desc: 'Cập nhật dữ liệu đã có trên server.', handler: 'PATCH /api/v1/.../{id}' });

    if (all.includes('delete')) els.push({ icon: '🗑️', label: 'DELETE', desc: 'Xóa bản ghi khỏi database.', handler: 'DELETE /api/v1/.../{id}' });

    if (els.length === 1) els.push({ icon: '📦', label: 'JSON Response', desc: 'Trả về kết quả dạng JSON cho frontend.', handler: 'return JSONResponse(data)' });

    return els;

  }



  // UI Component → suy luận từ tên

  const els = [];



  if (all.includes('form') || all.includes('login') || all.includes('create') || all.includes('edit')) {

    els.push({ icon: '📝', label: 'Ô nhập text (Input)', desc: 'Người dùng nhập dữ liệu văn bản. Validate không được rỗng.', handler: `onChange → setState() | Kiểm tra rỗng trước submit` });

    if (all.includes('login') || all.includes('password')) {

      els.push({ icon: '🔒', label: 'Ô mật khẩu (Password)', desc: 'Nhập mật khẩu, hỗ trợ ẩn/hiện bằng nút toggle eye icon.', handler: `type={showPw ? "text" : "password"} | toggleShowPassword()` });

    }

    if (all.includes('email')) els.push({ icon: '📧', label: 'Ô email', desc: 'Nhập email, validate định dạng email hợp lệ.', handler: 'regex /^[\\w.-]+@[\\w.-]+\\.\\w+$/' });

    els.push({ icon: '🔘', label: 'Nút gửi (Submit)', desc: 'Nhấn để gửi form. Gọi hàm xử lý chính, validate toàn bộ trước khi gọi API.', handler: `handleSubmit(e) → e.preventDefault() → gọi API` });

    if (all.includes('login')) {

      els.push({ icon: '☑️', label: 'Ghi nhớ đăng nhập', desc: 'Checkbox lưu thông tin đăng nhập cho lần sau.', handler: 'localStorage.setItem("remember", checked)' });

    }

  }



  if (all.includes('table') || all.includes('list') || all.includes('grid') || all.includes('datagrid')) {

    els.push({ icon: '📊', label: 'Bảng dữ liệu (Table)', desc: 'Hiển thị danh sách dạng bảng với các cột: mã, tên, trạng thái...', handler: 'useEffect → fetchData() → setRows(data)' });

    els.push({ icon: '📄', label: 'Hàng dữ liệu (Row)', desc: 'Mỗi hàng đại diện 1 bản ghi. Nhấn để xem chi tiết hoặc chọn.', handler: 'onClick → navigate(`/detail/${row.id}`)' });

    els.push({ icon: '🔢', label: 'Phân trang (Pagination)', desc: 'Điều hướng giữa các trang dữ liệu, mỗi trang ~20 bản ghi.', handler: 'setPage(n) → fetchData({ page: n, size: 20 })' });

  }



  if (all.includes('search') || all.includes('tim') || all.includes('filter')) {

    els.push({ icon: '🔍', label: 'Ô tìm kiếm (Search)', desc: 'Nhập từ khóa để lọc dữ liệu. Sử dụng debounce 500ms.', handler: 'handleSearch = debounce((q) => filter(q), 500)' });

  }



  if (all.includes('filter') || all.includes('dropdown') || all.includes('select') || all.includes('loc')) {

    els.push({ icon: '📋', label: 'Dropdown chọn', desc: 'Chọn giá trị từ danh sách thả xuống để lọc nhanh.', handler: 'onChange → setFilter(value) → refetch()' });

  }



  if (all.includes('button') || all.includes('btn') || all.includes('nut')) {

    els.push({ icon: '🔘', label: 'Nút nhấn (Button)', desc: 'Kích hoạt hành động khi nhấn: lưu, xóa, điều hướng...', handler: `onClick → handle${compName}Click()` });

  }



  if (all.includes('menu') || all.includes('action')) {

    els.push({ icon: '☰', label: 'Menu thao tác', desc: 'Menu popup hiển thị các lựa chọn: Sửa, Xóa, Đình chỉ.', handler: 'setMenuOpen(rowId) | click outside → close' });

    els.push({ icon: '✏️', label: 'Nút Chỉnh sửa', desc: 'Điều hướng đến trang chỉnh sửa bản ghi.', handler: 'navigate(`/edit/${id}`)' });

    els.push({ icon: '🗑️', label: 'Nút Xóa', desc: 'Hiện confirm dialog, sau đó gọi DELETE API.', handler: 'confirm() → api.delete(`/${id}`)' });

  }



  if (all.includes('modal') || all.includes('dialog') || all.includes('popup')) {

    els.push({ icon: '🪟', label: 'Hộp thoại (Modal)', desc: 'Overlay hiển thị nội dung phụ, chặn tương tác nền.', handler: 'setModalOpen(true) | z-index: 1000' });

    els.push({ icon: '❌', label: 'Nút đóng', desc: 'Đóng modal và quay về màn hình chính.', handler: 'setModalOpen(false)' });

  }



  if (all.includes('chart') || all.includes('graph') || all.includes('bieu')) {

    els.push({ icon: '📈', label: 'Biểu đồ (Chart)', desc: 'Hiển thị dữ liệu dạng đồ thị trực quan.', handler: 'recharts <BarChart> / <LineChart>' });

    els.push({ icon: '📊', label: 'Chú thích (Legend)', desc: 'Mô tả ý nghĩa từng màu/đường trên biểu đồ.', handler: '<Legend> component' });

  }



  if (all.includes('card') || all.includes('widget') || all.includes('panel') || all.includes('stat')) {

    els.push({ icon: '🏷️', label: 'Thẻ hiển thị (Card)', desc: 'Hiển thị thông tin tóm tắt dạng thẻ.', handler: 'props → render title, value, icon' });

    els.push({ icon: '🔢', label: 'Giá trị số liệu', desc: 'Con số KPI hoặc thống kê nhanh.', handler: 'fetchStats() → setCount(data.total)' });

  }



  if (all.includes('header') || all.includes('navbar') || all.includes('nav') || all.includes('sidebar')) {

    els.push({ icon: '📌', label: 'Thanh điều hướng', desc: 'Thanh cố định trên đầu/bên trái chứa menu chính.', handler: 'position: sticky | useLocation()' });

    els.push({ icon: '🔗', label: 'Liên kết (Link)', desc: 'Nhấn để chuyển đến trang khác trong hệ thống.', handler: '<Link to="/path"> | navigate("/path")' });

  }



  if (all.includes('upload') || all.includes('image') || all.includes('file') || all.includes('anh')) {

    els.push({ icon: '📎', label: 'Upload file', desc: 'Chọn file từ máy tính để tải lên server.', handler: 'input[type=file] → FormData → POST /upload' });

    els.push({ icon: '🖼️', label: 'Xem trước ảnh', desc: 'Hiển thị preview ảnh trước khi upload.', handler: 'FileReader.readAsDataURL(file)' });

  }



  if (all.includes('toggle') || all.includes('switch') || all.includes('check')) {

    els.push({ icon: '☑️', label: 'Checkbox / Toggle', desc: 'Bật/tắt một tùy chọn boolean.', handler: 'onChange → setState(!current)' });

  }



  if (all.includes('notification') || all.includes('alert') || all.includes('feed') || all.includes('bell')) {

    els.push({ icon: '🔔', label: 'Thông báo', desc: 'Hiển thị danh sách thông báo hệ thống.', handler: 'useEffect → fetchNotifications()' });

    els.push({ icon: '📌', label: 'Danh sách hoạt động', desc: 'Dòng thời gian các hoạt động gần đây.', handler: 'GET /activities → map(item)' });

  }



  if (all.includes('pagination') || all.includes('paging')) {

    els.push({ icon: '⏮️', label: 'Nút trang trước', desc: 'Quay lại trang trước đó.', handler: 'setPage(page - 1)' });

    els.push({ icon: '⏭️', label: 'Nút trang sau', desc: 'Chuyển sang trang tiếp theo.', handler: 'setPage(page + 1)' });

    els.push({ icon: '🔢', label: 'Số trang', desc: 'Hiển thị trang hiện tại / tổng số trang.', handler: 'Math.ceil(total / pageSize)' });

  }



  if (all.includes('export') || all.includes('download') || all.includes('xuat')) {

    els.push({ icon: '📥', label: 'Nút tải xuống', desc: 'Xuất dữ liệu ra file Excel/CSV để lưu trữ.', handler: 'exportToExcel(data) → download blob' });

  }



  if (els.length === 0) {

    els.push({ icon: '🧩', label: 'Thành phần giao diện', desc: 'Phần tử UI cơ bản của component.', handler: 'render()' });

  }



  return els;

};



const ScreenDetail = () => {

  const { id } = useParams();

  const navigate = useNavigate();

  const outletContext = useOutletContext() || {};

  const { showModal, startGlobalUpload, activeUploads } = outletContext;

  const [screen, setScreen] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  

  // States for search and filter

  const [searchQuery, setSearchQuery] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');



  // States for interactive simulation

  const [activeComponent, setActiveComponent] = useState(null);

  const [hoveredComponent, setHoveredComponent] = useState(null);

  const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint', 'workflow', or 'cards'

  const [blueprintOverlay, setBlueprintOverlay] = useState(false); // Design vs Blueprint overlay mode

  const [inspectorTab, setInspectorTab] = useState('user'); // 'user' or 'dev'



  // States for Scenarios Walkthrough

  const [activeScenario, setActiveScenario] = useState(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);



  // States for Sandbox API simulation

  const [sandboxLoading, setSandboxLoading] = useState({});

  const [sandboxOutputs, setSandboxOutputs] = useState({});

  const [sandboxPayloads, setSandboxPayloads] = useState({});



  // State quản lý việc hiển thị code chi tiết (ẩn/hiện)

  const [showCodeState, setShowCodeState] = useState({});



  // State lưu trữ bước đang chọn trong màn hình Workflow

  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);



  const fetchScreenDetail = async () => {

    try {

      setLoading(true);

      const data = await screenService.getScreenDetail(id);

      setScreen(data);

      setError(null);

    } catch (err) {

      console.error('Lỗi khi tải chi tiết màn hình:', err);

      setError('Không thể tải thông tin chi tiết màn hình. Vui lòng thử lại sau.');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    if (id) {

      fetchScreenDetail();

      setActiveScenario(null);

      setCurrentStepIndex(-1);

      setShowCodeState({});

      setSelectedWorkflowStep(0);

    }

  }, [id]);



  // Lọc và Tìm kiếm component

  const getFilteredComponents = () => {

    if (!screen || !screen.components) return [];

    

    return screen.components.filter((comp) => {

      const matchesSearch = 

        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||

        (comp.description && comp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||

        (comp.technical_details && comp.technical_details.toLowerCase().includes(searchQuery.toLowerCase())) ||

        (comp.file_path && comp.file_path.toLowerCase().includes(searchQuery.toLowerCase()));

        

      let matchesType = false;

      if (typeFilter === 'All') {

        matchesType = true;

      } else if (typeFilter === 'Logic / Service') {

        matchesType = comp.type === 'Business Logic' || comp.type === 'Logic / Service';

      } else {

        matchesType = comp.type === typeFilter;

      }

      

      return matchesSearch && matchesType;

    });

  };



  const filteredComponents = getFilteredComponents();



  // Đếm số lượng components theo phân loại

  const getStats = () => {

    if (!screen || !screen.components) return { total: 0, ui: 0, logic: 0, native: 0, api: 0 };

    

    return screen.components.reduce(

      (acc, comp) => {

        acc.total += 1;

        if (comp.type === 'UI Component') acc.ui += 1;

        else if (comp.type === 'Business Logic' || comp.type === 'Logic / Service') acc.logic += 1;

        else if (comp.type === 'Native API') acc.native += 1;

        else if (comp.type === 'API Endpoint') acc.api += 1;

        return acc;

      },

      { total: 0, ui: 0, logic: 0, native: 0, api: 0 }

    );

  };



  const stats = getStats();



  const getTypeClass = (type) => {

    if (type === 'Business Logic' || type === 'Logic / Service') return 'logic';

    if (type === 'Native API') return 'native';

    if (type === 'API Endpoint') return 'api';

    return 'ui';

  };



  const getTypeLabel = (type) => {

    if (type === 'Business Logic') return 'Logic / Service';

    return type;

  };



  // Kịch bản trải nghiệm mẫu cho màn hình hiện tại

  const currentScenarios = screen ? (() => {

    const docKey = normalizeTitle(screen.title);

    const platform = screen.platform || 'Web';

    const doc = SCREEN_DOCS[platform]?.[docKey] || SCREEN_DOCS.Web[docKey] || SCREEN_DOCS.Mobile[docKey];

    if (doc && doc.scenarios && doc.scenarios.length > 0) return doc.scenarios;

    return [

      {

        title: "🛠️ Khám phá giao diện chính",

        description: "Thao tác tuần tự xem các thành phần thiết kế trên màn hình này.",

        steps: screen.components.filter(c => c.type === 'UI Component').map(c => ({

          target: c.name,

          action: "Tương tác",

          note: `Nhìn vào vị trí cấu hình của thành phần ${c.name} trên bản vẽ.`

        }))

      }

    ];

  })() : [];



  // Luồng nghiệp vụ (Workflow) hiện tại

  const currentWorkflow = screen ? getWorkflowForScreen(screen, screen.components) : [];



  // Thao tác với kịch bản Walkthrough

  const startScenario = (scen) => {

    setActiveScenario(scen);

    setCurrentStepIndex(0);

    const targetComp = scen.steps[0].target;

    setActiveComponent(targetComp);

    scrollToComponent(targetComp);

    setViewMode('blueprint'); // Chuyển qua tab Bản vẽ mô phỏng để chạy kịch bản

  };



  const nextStep = () => {

    if (!activeScenario) return;

    const nextIdx = currentStepIndex + 1;

    if (nextIdx < activeScenario.steps.length) {

      setCurrentStepIndex(nextIdx);

      const targetComp = activeScenario.steps[nextIdx].target;

      setActiveComponent(targetComp);

      scrollToComponent(targetComp);

    } else {

      setCurrentStepIndex(-1);

      setActiveScenario(null);

    }

  };



  const prevStep = () => {

    if (!activeScenario || currentStepIndex <= 0) return;

    const prevIdx = currentStepIndex - 1;

    setCurrentStepIndex(prevIdx);

    const targetComp = activeScenario.steps[prevIdx].target;

    setActiveComponent(targetComp);

    scrollToComponent(targetComp);

  };



  const scrollToComponent = (name) => {

    setTimeout(() => {

      const cardEl = document.getElementById(`comp-card-${name}`);

      if (cardEl) {

        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      }

      const blockEl = document.querySelector(`[data-comp-name="${name}"]`);

      if (blockEl) {

        blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      }

    }, 100);

  };



  // Giả lập gọi API Sandbox

  const runSandbox = (compName, customPayloadText) => {

    setSandboxLoading(prev => ({ ...prev, [compName]: true }));

    setTimeout(() => {

      const mockResult = getSandboxResponse(screen, compName);

      if (customPayloadText) {

        try {

          mockResult.request = JSON.parse(customPayloadText);

        } catch (e) {

          console.error("Failed to parse custom payload JSON:", e);

        }

      }

      setSandboxOutputs(prev => ({ ...prev, [compName]: { ...mockResult } }));

      setSandboxLoading(prev => ({ ...prev, [compName]: false }));

    }, 850);

  };



  const toggleShowCode = (compName) => {

    setShowCodeState(prev => ({

      ...prev,

      [compName]: !prev[compName]

    }));

  };



  const handleRefresh = () => {

    // Refresh screen data if needed

    fetchScreenDetail();

  };



  if (loading) {

    return (

      <div className="detail-container">

        <div className="loading-state">

          <div className="spinner"></div>

          <p>Đang tải chi tiết cấu hình màn hình...</p>

        </div>

      </div>

    );

  }



  if (error || !screen) {

    return (

      <div className="detail-container">

        <div className="error-card">

          <p className="error-text">{error || 'Không tìm thấy màn hình yêu cầu'}</p>

          <button className="btn-back" onClick={() => navigate('/admin/screens')}>

            ← Quay lại danh sách

          </button>

        </div>

      </div>

    );

  }



  const isModified = screen.current_code !== screen.default_code;



  return (

    <div className="detail-container fade-in">



      {/* Toolbar */}

      <div className="mgmt-toolbar card">

        <div className="toolbar-left">

          <div className="screen-info">

            <span className={`platform-badge ${screen.platform}`}>

              {screen.platform === 'Web' ? '🖥️ Web' : '📱 Mobile'}

            </span>

            <span className={`code-badge ${isModified ? 'modified' : ''}`}>

              {screen.current_code}

            </span>

            <div className="route-info-box">

              <span className="route-label">Route:</span>

              <span className="route-value font-mono">{screen.route_path}</span>

            </div>

          </div>

        </div>

        <div className="toolbar-right">

          <div className="view-mode-tabs">

            <button 

              className={`view-mode-btn ${viewMode === 'blueprint' ? 'active' : ''}`}

              onClick={() => setViewMode('blueprint')}

            >

              🖥️ Bản vẽ mô phỏng

            </button>

            <button 

              className={`view-mode-btn ${viewMode === 'workflow' ? 'active' : ''}`}

              onClick={() => {

                setViewMode('workflow');

                setSelectedWorkflowStep(0);

              }}

            >

              📊 Luồng nghiệp vụ

            </button>

            <button 

              className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}

              onClick={() => setViewMode('cards')}

            >

              🗂️ Danh sách thẻ

            </button>

          </div>

        </div>

      </div>



      {/* Ghi chú auto-sync */}

      <div className="auto-sync-banner">

        <span className="sync-icon">🔄</span>

        <span>Dữ liệu components được <strong>tự động đồng bộ</strong> từ hệ thống mỗi khi server khởi động. Không cần thao tác thủ công.</span>

      </div>





      {viewMode === 'blueprint' && (

        /* Layout 3 cột: Components (trái) | Bản vẽ (giữa) | Chi tiết (phải) */

        <div className={`detail-layout-grid platform-${screen.platform?.toLowerCase() || 'web'}`}>

          

          {/* CỘT TRÁI: Danh sách Components chi tiết */}

          <div className="component-tree-pane">

            <div className="pane-header">

              <span className="pane-icon">🧩</span>

              <span className="pane-title">Components</span>

            </div>

            <div className="tree-filter-box">

              <div className="tree-search-wrapper">

                <span className="search-icon-compact">🔍</span>

                <input type="text" placeholder="Tìm component..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="tree-search-input" />

              </div>

              <div className="tree-filter-tabs">

                {['All', 'UI Component', 'Logic / Service', 'API Endpoint'].map(tab => (

                  <button key={tab} className={`tree-filter-btn ${typeFilter === tab ? 'active' : ''}`} onClick={() => setTypeFilter(tab)}>

                    {tab === 'All' ? 'Tất cả' : tab === 'UI Component' ? 'UI' : tab === 'Logic / Service' ? 'Logic' : 'API'}

                  </button>

                ))}

              </div>

            </div>

            <div className="tree-scroll-area">

              {filteredComponents.length === 0 ? (

                <div className="tree-empty">Không tìm thấy</div>

              ) : (

                ['UI Component', 'Logic / Service', 'API Endpoint', 'Native API'].map(groupType => {

                  const compsInGroup = filteredComponents.filter(c => {

                    if (groupType === 'Logic / Service') return c.type === 'Logic / Service' || c.type === 'Business Logic';

                    return c.type === groupType;

                  });

                  if (compsInGroup.length === 0) return null;

                  const groupLabel = groupType === 'UI Component' ? 'UI Components' :

                    (groupType === 'Logic / Service') ? 'Logic & Services' :

                    groupType === 'API Endpoint' ? 'API Endpoints' : 'Native APIs';

                  return (

                    <div key={groupType} className="tree-group">

                      <div className="tree-group-label">{groupLabel}</div>

                      {compsInGroup.map(comp => {

                        const isSelected = activeComponent === comp.name;

                        const typeClass = getTypeClass(comp.type);

                        const subEls = getComponentSubElements(comp);

                        return (

                          <div key={comp.id} className={`tree-comp-item ${isSelected ? 'selected' : ''}`}

                            onClick={() => setActiveComponent(comp.name)}

                            onMouseEnter={() => setHoveredComponent(comp.name)}

                            onMouseLeave={() => setHoveredComponent(null)}>

                            <div className="tree-comp-row">

                              <span className="tree-comp-dot" data-type={typeClass}></span>

                              <span className="tree-comp-name">{comp.name}</span>

                              {isSelected && <span className="tree-comp-check">✓</span>}

                            </div>

                            <div className="tree-sub-elements">

                              {subEls.map((el, idx) => (

                                <div key={idx} className="tree-sub-el">

                                  <span className="tree-sub-el-icon">{el.icon}</span>

                                  <span className="tree-sub-el-name">{el.label}</span>

                                </div>

                              ))}

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  );

                })

              )}

            </div>

          </div>



          {/* CỘT GIỮA: Bản vẽ thiết kế tương tác */}

          <div className="detail-simulator-pane">

            <div className="pane-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                <span className="pane-icon">🖥️</span>

                <span className="pane-title">Thiết kế & Mô phỏng</span>

              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                <button className={`blueprint-toggle-btn ${blueprintOverlay ? 'active' : ''}`}

                  onClick={() => setBlueprintOverlay(!blueprintOverlay)} title="Bật/Tắt đường bao thiết kế">

                  📐 {blueprintOverlay ? 'Bật' : 'Tắt'}

                </button>

              </div>

            </div>

            {activeScenario && currentStepIndex >= 0 && (

              <div className="walkthrough-widget">

                <div className="walkthrough-bar-title">

                  <span>🎬 Kịch bản: <strong>{activeScenario.title}</strong></span>

                  <button className="walkthrough-close" onClick={() => { setActiveScenario(null); setCurrentStepIndex(-1); }}>×</button>

                </div>

                <div className="walkthrough-step-desc">

                  <span className="step-num-badge">Bước {currentStepIndex + 1}/{activeScenario.steps.length}</span>

                  <span className="step-action-tag">{activeScenario.steps[currentStepIndex].action}</span>

                  <strong>{activeScenario.steps[currentStepIndex].target}:</strong> {activeScenario.steps[currentStepIndex].note}

                </div>

                <div className="walkthrough-actions">

                  <button className="walkthrough-btn" onClick={prevStep} disabled={currentStepIndex === 0}>◀ Trước</button>

                  <button className="walkthrough-btn primary" onClick={nextStep}>

                    {currentStepIndex === activeScenario.steps.length - 1 ? 'Xong 🎉' : 'Tiếp ▶'}

                  </button>

                </div>

              </div>

            )}

            <div className={`simulator-wrapper ${blueprintOverlay ? 'simulation-blueprint-active' : ''}`}>

              <ScreenSimulator screenCode={screen.current_code} platform={screen.platform} routePath={screen.route_path}

                components={screen.components} activeComponent={activeComponent} hoveredComponent={hoveredComponent}

                onHover={setHoveredComponent} onClick={(name) => { setActiveComponent(name); scrollToComponent(name); }}

                startGlobalUpload={startGlobalUpload} onRefresh={handleRefresh} simulationMode="mockup" />

            </div>

          </div>



          {/* CỘT PHẢI: Chi tiết giải thích component đang chọn */}

          <div className="detail-inspector-pane">

            <div className="pane-header">

              <span className="pane-icon">📋</span>

              <span className="pane-title">Chi tiết Component</span>

            </div>

            <div className="inspector-detail-view">

              {(() => {

                const comp = screen.components.find(c => c.name === activeComponent) || filteredComponents[0] || screen.components[0];

                if (!comp) return (<div className="empty-detail-state"><span className="empty-detail-icon">🔍</span><p>Chọn một component để xem chi tiết.</p></div>);

                const typeClass = getTypeClass(comp.type);

                const typeLabel = getTypeLabel(comp.type);

                const connected = getConnections(screen, comp.name);

                const sandboxOut = sandboxOutputs[comp.name];

                const isSandboxLoading = sandboxLoading[comp.name];

                let codeDetails = getComponentCodeDetails(screen, comp.name);

                let dbTables = [];

                let calledApis = [];

                let userGuideText = comp.description || 'Chưa cập nhật.';

                let backendLogicText = "";



                if (comp.technical_details && comp.technical_details.trim().startsWith('{')) {

                  try {

                    let jsonStr = comp.technical_details

                      .replace(/\\u000e0/g, '\\u00e0')

                      .replace(/\\u000e/g, '')

                      .replace(/\u000e0/g, 'à')

                      .replace(/\u000e/g, '');

                    const parsed = JSON.parse(jsonStr);

                    if (parsed) {

                      const fixUnicodeChars = (str) => {

                        if (typeof str !== 'string') return str;

                        return str.replace(/\u000e0/g, 'à').replace(/\u000e/g, '');

                      };

                      if (parsed.handler_name || parsed.code_snippet) {

                        codeDetails = {

                          handlerName: fixUnicodeChars(parsed.handler_name) || codeDetails.handlerName,

                          params: parsed.params || "event: any",

                          processing: fixUnicodeChars(parsed.details) || codeDetails.processing,

                          codeSnippet: parsed.code_snippet || codeDetails.codeSnippet

                        };

                      }

                      if (parsed.database_tables) {

                        dbTables = Array.isArray(parsed.database_tables) ? parsed.database_tables : [parsed.database_tables];

                      }

                      if (parsed.called_apis) {

                        calledApis = Array.isArray(parsed.called_apis) ? parsed.called_apis : [parsed.called_apis];

                      }

                      if (parsed.user_guide) {

                        userGuideText = fixUnicodeChars(parsed.user_guide);

                      }

                      if (parsed.details) {

                        backendLogicText = fixUnicodeChars(parsed.details);

                      }

                    }

                  } catch (e) {

                    console.error("Failed to parse codeDetails from technical_details:", e);

                  }

                }

                const isShowCode = showCodeState[comp.name] || false;

                return (

                  <div className="component-detail-wrapper">

                    <div className="comp-detail-header-card">

                      <div className="comp-detail-meta">

                        <span className={`comp-type-badge ${typeClass}`}>{typeLabel}</span>

                        <span className="comp-auto-tag">⚡ Hệ thống tự động đồng bộ</span>

                      </div>

                      <h3 className="comp-detail-name">{comp.name}</h3>

                      {comp.file_path && (

                        <div className="comp-detail-file-box">

                          <span className="file-icon">📁</span>

                          <span className="file-path font-mono" title={comp.file_path}>{comp.file_path}</span>

                          <button className="btn-copy-path" onClick={() => { navigator.clipboard.writeText(comp.file_path); alert('Đã sao chép!'); }}>📋 Copy</button>

                        </div>

                      )}

                    </div>



                    {/* Mode Toggle Selector */}

                    <div className="inspector-mode-toggle">

                      <button 

                        className={`inspector-toggle-btn ${inspectorTab === 'user' ? 'active' : ''}`}

                        onClick={() => setInspectorTab('user')}

                      >

                        👥 Hướng dẫn sử dụng

                      </button>

                      <button 

                        className={`inspector-toggle-btn ${inspectorTab === 'dev' ? 'active' : ''}`}

                        onClick={() => setInspectorTab('dev')}

                      >

                        💻 Đặc tả kỹ thuật (Dev)

                      </button>

                    </div>



                    {inspectorTab === 'user' ? (

                      /* USER GUIDE TAB VIEW */

                      <div className="tab-content-user fade-in">

                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Chức năng & Nghiệp vụ</h4>

                          <div className="detail-desc-box user-guide-box">

                            {userGuideText}

                          </div>

                        </div>



                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Thành phần Giao diện & Tương tác</h4>

                          <div className="sub-elements-detail-list">

                            {getComponentSubElements(comp).map((el, idx) => (

                              <div key={idx} className="sub-el-detail-card user-friendly">

                                <div className="sub-el-detail-header">

                                  <span className="sub-el-detail-icon">{el.icon}</span>

                                  <span className="sub-el-detail-label">{el.label}</span>

                                </div>

                                <div className="sub-el-detail-desc">{el.desc}</div>

                              </div>

                            ))}

                          </div>

                        </div>



                        {currentScenarios && currentScenarios.length > 0 && (

                          <div className="comp-detail-section">

                            <h4 className="detail-section-title">Kịch bản Vận hành liên quan</h4>

                            <div className="scenarios-grid">

                              {currentScenarios.filter(scen => 

                                scen.steps.some(step => step.target === comp.name)

                              ).map((scen, idx) => (

                                <div key={idx} className="scenario-item-card user-guide-scen" onClick={() => startScenario(scen)}>

                                  <div className="scen-card-title">{scen.title}</div>

                                  <div className="scen-card-desc">{scen.description}</div>

                                  <div className="scen-card-action">Chạy thử kịch bản này ➔</div>

                                </div>

                              ))}

                            </div>

                          </div>

                        )}

                      </div>

                    ) : (

                      /* DEVELOPER SPEC TAB VIEW */

                      <div className="tab-content-dev fade-in">

                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Logic Xử lý phía Server (Backend)</h4>

                          <div className="detail-desc-box dev-logic-box">

                            {backendLogicText || comp.description || 'Chưa cập nhật logic backend.'}

                          </div>

                        </div>



                        {/* Database tables touched with detailed analysis */}

                        {(dbTables.length > 0 || comp.description) && (

                          <div className="comp-detail-section">

                            <h4 className="detail-section-title">Bảng Cơ sở dữ liệu tác động</h4>

                            <table className="dev-db-table">

                              <thead>

                                <tr>

                                  <th>Bảng dữ liệu</th>

                                  <th>Thao tác</th>

                                  <th>Mô tả tác động</th>

                                </tr>

                              </thead>

                              <tbody>

                                {getDatabaseOperations(comp, dbTables).map((op, opIdx) => (

                                  <tr key={opIdx}>

                                    <td className="font-mono text-bold">🗄️ {op.table}</td>

                                    <td>

                                      <span className={`db-action-badge ${op.action.includes('Đọc') ? 'read' : 'write'}`}>

                                        {op.action}

                                      </span>

                                    </td>

                                    <td>{op.impact}</td>

                                  </tr>

                                ))}

                              </tbody>

                            </table>

                          </div>

                        )}



                        {/* Calling APIs with parameter details */}

                        {calledApis.length > 0 && (

                          <div className="comp-detail-section">

                            <h4 className="detail-section-title">APIs gọi xuống & Tham số đầu vào</h4>

                            <div className="apis-list-container">

                              {calledApis.map((apiItem, aIdx) => {

                                const apiDoc = getApiDocumentation(apiItem);

                                return (

                                  <div key={aIdx} className="api-doc-block">

                                    <div className="api-endpoint-pill font-mono">

                                      <span className="api-method-badge">{apiDoc.method}</span>

                                      <span className="api-path-text">{apiDoc.path}</span>

                                    </div>

                                    <table className="dev-api-params-table">

                                      <thead>

                                        <tr>

                                          <th>Tham số</th>

                                          <th>Kiểu dữ liệu</th>

                                          <th>Bắt buộc</th>

                                          <th>Mô tả</th>

                                        </tr>

                                      </thead>

                                      <tbody>

                                        {apiDoc.params.map((p, pIdx) => (

                                          <tr key={pIdx}>

                                            <td className="font-mono text-bold">{p.name}</td>

                                            <td className="font-mono text-muted">{p.type}</td>

                                            <td>

                                              <span className={`param-req-badge ${p.required === 'Có' ? 'yes' : 'no'}`}>

                                                {p.required}

                                              </span>

                                            </td>

                                            <td>{p.desc}</td>

                                          </tr>

                                        ))}

                                      </tbody>

                                    </table>

                                  </div>

                                );

                              })}

                            </div>

                          </div>

                        )}



                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Liên kết nghiệp vụ (Data-flow)</h4>

                          <div className="comp-flow-mapping">

                            <span className="flow-pill-source">{comp.name}</span>

                            <span className="flow-arrow">➔</span>

                            {connected.map((conn, cIdx) => (

                              <React.Fragment key={cIdx}>

                                {cIdx > 0 && <span className="flow-arrow">➔</span>}

                                <span className="flow-pill-dest">{conn}</span>

                              </React.Fragment>

                            ))}

                          </div>

                        </div>



                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Mã nguồn xử lý & Hàm chính</h4>

                          <div className="detail-code-box">

                            <div className="detail-code-header font-mono">⚙️ {codeDetails.handlerName}({codeDetails.params})</div>

                            <div className="detail-code-desc"><strong>Xử lý:</strong> {codeDetails.processing}</div>

                            <button className="btn-toggle-code" onClick={() => toggleShowCode(comp.name)}>

                              {isShowCode ? '🔼 Thu gọn' : '💻 Xem code chi tiết'}

                            </button>

                            {isShowCode && (

                              <div className="code-snippet-container">

                                <button className="btn-copy-code" onClick={() => { navigator.clipboard.writeText(codeDetails.codeSnippet); alert('Đã sao chép!'); }}>Copy</button>

                                <pre className="detail-code-snippet font-mono"><code>{codeDetails.codeSnippet}</code></pre>

                              </div>

                            )}

                          </div>

                        </div>



                        <div className="comp-detail-section">

                          <h4 className="detail-section-title">Giả lập & Chạy thử (Sandbox)</h4>

                          <div className="detail-sandbox-box">

                            <p className="sandbox-info-text">Cấu hình Request Payload dưới đây và click chạy thử:</p>

                            <div className="sandbox-input-area" style={{ marginBottom: 12 }}>

                              <textarea

                                className="sandbox-payload-editor font-mono"

                                rows={5}

                                style={{ width: '100%', background: '#1E1E1E', color: '#85C1E9', border: '1px solid #7B5233', borderRadius: 6, padding: 8, fontSize: '0.8rem', resize: 'vertical' }}

                                value={sandboxPayloads[comp.name] !== undefined ? sandboxPayloads[comp.name] : (() => {

                                  const defaultResult = getSandboxResponse(screen, comp.name);

                                  return JSON.stringify(defaultResult.request, null, 2);

                                })()}

                                onChange={(e) => {

                                  const val = e.target.value;

                                  setSandboxPayloads(prev => ({ ...prev, [comp.name]: val }));

                                }}

                              />

                            </div>

                            <button className="btn-run-sandbox" onClick={() => runSandbox(comp.name, sandboxPayloads[comp.name])} disabled={isSandboxLoading}>

                              {isSandboxLoading ? '⏳ Đang gọi...' : '⚡ Chạy thử Nghiệp Vụ'}

                            </button>

                            {sandboxOut && (

                              <div className="sandbox-console-output font-mono">

                                <div className="console-line-url">ENDPOINT: {sandboxOut.url}</div>

                                <div className="console-line-req">PAYLOAD: {JSON.stringify(sandboxOut.request, null, 2)}</div>

                                <div className="console-line-res">RESPONSE: {JSON.stringify(sandboxOut.response, null, 2)}</div>

                              </div>

                            )}

                          </div>

                        </div>

                      </div>

                    )}

                  </div>

                );

              })()}

            </div>

          </div>

        </div>

      )}



      {viewMode === 'workflow' && (

        /* CHẾ ĐỘ XEM LUỒNG NGHIỆP VỤ (Interactive Workflow Mode) */

        <div className={`detail-layout-grid platform-${screen.platform?.toLowerCase() || 'web'}`}>

          

          {/* Cột trái: Sơ đồ luồng nghiệp vụ động dạng flowchart */}

          <div className="detail-simulator-pane">

            <div className="pane-header">

              <span className="pane-icon">📊</span>

              <span className="pane-title">Sơ đồ Luồng Nghiệp vụ (Process Flowchart)</span>

            </div>

            

            <div className="workflow-graph-container">

              {currentWorkflow.map((node, index) => {

                const isActiveNode = selectedWorkflowStep === index;

                

                return (

                  <div key={index} className="workflow-step-wrapper">

                    {index > 0 && (

                      <div className={`workflow-connector-line ${isActiveNode ? 'pulse-active' : ''}`}>

                        <div className="connector-arrow">▼</div>

                      </div>

                    )}

                    

                    <div 

                      className={`workflow-node-card ${isActiveNode ? 'node-active' : ''}`}

                      onClick={() => {

                        setSelectedWorkflowStep(index);

                        setActiveComponent(node.component);

                        scrollToComponent(node.component);

                      }}

                    >

                      <div className="node-step-circle">{node.step}</div>

                      <div className="node-content">

                        <h4 className="node-title">{node.title}</h4>

                        <p className="node-desc">{node.desc}</p>

                        

                        <div className="node-tags-row" style={{ marginTop: 6 }}>

                          <span className="node-tag comp">📱 {node.component}</span>

                          <span className="node-tag api">🌐 {node.api}</span>

                          <span className="node-tag logic">⚙️ {node.logic}</span>

                        </div>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>



          {/* Cột phải: Inspector hiển thị thông tin kỹ thuật & Sandbox cho bước đang chọn */}

          <div className="detail-inspector-pane">

            <div className="pane-header">

              <span className="pane-icon">🔍</span>

              <span className="pane-title">Kỹ thuật & Code cho Bước {selectedWorkflowStep + 1}</span>

            </div>



            {/* Kịch bản nghiệp vụ */}

            <div className="scenarios-section" style={{ borderBottom: '1px solid #EADCC9', paddingBottom: '15px' }}>

              <h4 className="inspector-section-lbl" style={{ margin: '15px 20px 10px' }}>🎬 Kịch bản nghiệp vụ:</h4>

              <div className="scenarios-grid" style={{ padding: '0 20px' }}>

                {currentScenarios.map((scen, idx) => (

                  <div key={idx} className="scenario-item-card" onClick={() => startScenario(scen)}>

                    <div className="scen-card-title">{scen.title}</div>

                    <div className="scen-card-desc">{scen.description}</div>

                  </div>

                ))}

              </div>

            </div>



            <div className="inspector-detail-view">

              {currentWorkflow[selectedWorkflowStep] ? (() => {

                const node = currentWorkflow[selectedWorkflowStep];

                const matchingComp = screen.components.find(c => c.name === node.component);

                let codeDetails = getComponentCodeDetails(screen, node.component);

                if (matchingComp && matchingComp.technical_details && matchingComp.technical_details.trim().startsWith('{')) {

                  try {

                    let jsonStr = matchingComp.technical_details

                      .replace(/\\u000e0/g, '\\u00e0')

                      .replace(/\\u000e/g, '')

                      .replace(/\u000e0/g, 'à')

                      .replace(/\u000e/g, '');

                    const parsed = JSON.parse(jsonStr);

                    if (parsed.handler_name || parsed.code_snippet) {

                      const fixUnicodeChars = (str) => {

                        if (typeof str !== 'string') return str;

                        return str.replace(/\u000e0/g, 'à').replace(/\u000e/g, '');

                      };

                      codeDetails = {

                        handlerName: fixUnicodeChars(parsed.handler_name) || codeDetails.handlerName,

                        params: parsed.params || "event: any",

                        processing: fixUnicodeChars(parsed.details) || codeDetails.processing,

                        codeSnippet: parsed.code_snippet || codeDetails.codeSnippet

                      };

                    }

                  } catch (e) {

                    console.error("Failed to parse codeDetails from workflow component:", e);

                  }

                }

                const isSandboxLoading = sandboxLoading[node.component];

                const sandboxOut = sandboxOutputs[node.component];



                return (

                  <div className="workflow-inspect-details">

                    <h3 className="wf-detail-title">{node.title}</h3>

                    <p className="wf-detail-desc">{node.desc}</p>

                    

                    <div style={{ marginTop: 16 }}>

                      <h4 className="section-subtitle">Thành phần UI liên đới:</h4>

                      <div className="wf-comp-pill font-mono">{node.component}</div>

                      {matchingComp && (

                        <p style={{ fontSize: '0.82rem', color: '#4A2E20', margin: '4px 0 0 0' }}>

                          {matchingComp.description}

                        </p>

                      )}

                    </div>



                    <div style={{ marginTop: 16 }}>

                      <h4 className="section-subtitle">API Gọi Xuống Hệ Thống:</h4>

                      <div className="wf-api-pill font-mono">{node.api}</div>

                    </div>



                    <div style={{ marginTop: 16 }}>

                      <h4 className="section-subtitle">Xử lý logic backend/frontend:</h4>

                      <div className="wf-logic-pill font-mono">{node.logic}</div>

                    </div>



                    <div style={{ marginTop: 20 }}>

                      <h4 className="section-subtitle">Mã nguồn mẫu của bước này:</h4>

                      <pre style={{ 

                        background: '#1E1E1E', 

                        color: '#A9B7C6', 

                        padding: '10px 12px', 

                        borderRadius: 6, 

                        fontSize: '0.68rem', 

                        overflowX: 'auto', 

                        marginTop: 6, 

                        fontFamily: 'monospace',

                        textAlign: 'left',

                        borderLeft: '3px solid #7B5233'

                      }}>

                        <code>{codeDetails.codeSnippet}</code>

                      </pre>

                    </div>



                    <div style={{ marginTop: 20 }}>

                      <h4 className="section-subtitle">Chạy thử nghiệp vụ cho bước này:</h4>

                      <button 

                        className="btn-run-sandbox"

                        onClick={() => runSandbox(node.component)}

                        disabled={isSandboxLoading}

                        style={{ marginTop: 6 }}

                      >

                        {isSandboxLoading ? '⏳ Đang gọi API...' : '⚡ Chạy thử Nghiệp Vụ (Simulate Step)'}

                      </button>



                      {sandboxOut && (

                        <div className="sandbox-console-output font-mono">

                          <div className="console-line-url">URL: {sandboxOut.url}</div>

                          <div className="console-line-req">Payload: {JSON.stringify(sandboxOut.request, null, 2)}</div>

                          <div className="console-line-res">Response: {JSON.stringify(sandboxOut.response, null, 2)}</div>

                        </div>

                      )}

                    </div>

                  </div>

                );

              })() : (

                <p style={{ color: '#7B5233', fontStyle: 'italic' }}>Hãy chọn một bước trên sơ đồ.</p>

              )}

            </div>

          </div>

        </div>

      )}



      {viewMode === 'cards' && (

        /* Chế độ xem danh sách thẻ truyền thống (Full width) */

        <>

          {/* Thanh công cụ tìm kiếm và lọc */}

          <div className="toolbar-section">

            <div className="toolbar-left">

              <div className="search-input-wrapper">

                <span className="search-icon">🔍</span>

                <input 

                  type="text" 

                  placeholder="Tìm kiếm components theo tên, file path, nghiệp vụ..." 

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}

                  className="search-input"

                />

                {searchQuery && (

                  <button className="btn-clear-search" onClick={() => setSearchQuery('')}>×</button>

                )}

              </div>

              <div className="filter-select-wrapper">

                <select 

                  value={typeFilter} 

                  onChange={(e) => setTypeFilter(e.target.value)}

                  className="filter-select"

                >

                  <option value="All">Tất cả phân loại</option>

                  <option value="UI Component">UI Component</option>

                  <option value="Logic / Service">Logic / Service</option>

                  <option value="Native API">Native API</option>

                  <option value="API Endpoint">API Endpoint</option>

                </select>

              </div>

            </div>

            <div className="result-count">

              {filteredComponents.length} / {stats.total} components

            </div>

          </div>



          {filteredComponents.length === 0 ? (

            <div className="empty-components-card">

              <div className="empty-icon">📁</div>

              <h3>Không tìm thấy component nào</h3>

              <p>Hãy thử tìm kiếm với từ khóa khác hoặc chờ hệ thống tự động cập nhật.</p>

              {(searchQuery || typeFilter !== 'All') && (

                <button className="btn-reset-filters" onClick={() => { setSearchQuery(''); setTypeFilter('All'); }}>

                  Xóa bộ lọc

                </button>

              )}

            </div>

          ) : (

            <div className="components-grid">

              {filteredComponents.map((comp) => {

                const typeClass = getTypeClass(comp.type);

                const typeLabel = getTypeLabel(comp.type);

                

                return (

                  <div key={comp.id} className="component-card">

                    <div className="comp-card-header">

                      <span className={`comp-type-badge ${typeClass}`}>

                        {typeLabel}

                      </span>

                      <span className="comp-auto-tag" title="Tự động sinh từ hệ thống">⚡ Auto</span>

                    </div>

                    

                    <h3 className="comp-name">{comp.name}</h3>

                    

                    {comp.file_path && (

                      <div className="comp-file-box">

                        <span className="file-icon">📁</span>

                        <span className="file-path font-mono" title={comp.file_path}>

                          {comp.file_path}

                        </span>

                      </div>

                    )}

                    

                    <div className="comp-body">

                      <h4 className="section-subtitle">Chức năng tổng quát:</h4>

                      <p className="comp-desc">{comp.description || 'Chưa cập nhật mô tả chức năng.'}</p>

                      

                      <h4 className="section-subtitle">Chi tiết luồng xử lý:</h4>

                      <div className="comp-technical font-mono">

                        {renderTechnicalDetails(comp.technical_details)}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </>

      )}



    </div>

  );

};



export default ScreenDetail;

