import React, { useState, useEffect } from 'react';

import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

import { screenService } from '@modules/System/Models/screen.service';

import ScreenSimulator from '@modules/System/Views/components/ScreenSimulation';

import SCREEN_DOCS from './components/screenDocs';



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

  const [mobilePane, setMobilePane] = useState('simulator'); // 'tree', 'simulator', or 'inspector' on mobile



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

              🖥️<span className="desktop-inline"> Bản vẽ mô phỏng</span><span className="mobile-inline"> Bản vẽ</span>

            </button>

            <button 

              className={`view-mode-btn ${viewMode === 'workflow' ? 'active' : ''}`}

              onClick={() => {

                setViewMode('workflow');

                setSelectedWorkflowStep(0);

              }}

            >

              📊<span className="desktop-inline"> Luồng nghiệp vụ</span><span className="mobile-inline"> Nghiệp vụ</span>

            </button>

            <button 

              className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}

              onClick={() => setViewMode('cards')}

            >

              🗂️<span className="desktop-inline"> Danh sách thẻ</span><span className="mobile-inline"> Dạng thẻ</span>

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

        <>

          {/* Mobile sub-tabs selector */}

          <div className="mobile-pane-tabs mobile-only">

            <button 

              className={`mobile-pane-tab ${mobilePane === 'tree' ? 'active' : ''}`}

              onClick={() => setMobilePane('tree')}

            >

              🧩 Cấu trúc

            </button>

            <button 

              className={`mobile-pane-tab ${mobilePane === 'simulator' ? 'active' : ''}`}

              onClick={() => setMobilePane('simulator')}

            >

              🖥️ Mô phỏng

            </button>

            <button 

              className={`mobile-pane-tab ${mobilePane === 'inspector' ? 'active' : ''}`}

              onClick={() => setMobilePane('inspector')}

            >

              📋 Chi tiết

            </button>

          </div>



          <div className={`detail-layout-grid platform-${screen.platform?.toLowerCase() || 'web'}`}>

            {/* CỘT TRÁI: Danh sách Components chi tiết */}

            <div className={`component-tree-pane ${mobilePane === 'tree' ? 'mobile-active' : 'mobile-hidden'}`}>

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

                            onClick={() => { setActiveComponent(comp.name); setMobilePane('inspector'); }}

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

          <div className={`detail-simulator-pane ${mobilePane === 'simulator' ? 'mobile-active' : 'mobile-hidden'}`}>

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

                onHover={setHoveredComponent} onClick={(name) => { setActiveComponent(name); setMobilePane('inspector'); scrollToComponent(name); }}

                startGlobalUpload={startGlobalUpload} onRefresh={handleRefresh} simulationMode="mockup" />

            </div>

          </div>



          {/* CỘT PHẢI: Chi tiết giải thích component đang chọn */}

          <div className={`detail-inspector-pane ${mobilePane === 'inspector' ? 'mobile-active' : 'mobile-hidden'}`}>

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
        </>
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



      <style dangerouslySetInnerHTML={{ __html: `
.detail-container {
  width: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Outfit', 'Inter', sans-serif;
  color: #2D1A12;
  min-height: auto;
}

/* Thu nhỏ padding của container chính trên trang này để khít viewport */
.dashboard-content:has(.detail-container) {
  padding: 15px 20px !important;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

/* Toolbar - Match UserManagement */
.mgmt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #E0E0E0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn-back-arrow {
  background: none;
  border: 1px solid #E0E0E0;
  color: #2D1A12;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-back-arrow:hover {
  background: #F8F5F1;
  border-color: #7B5233;
}

.screen-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.screen-info h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2D1A12;
}

/* Sleek Left-side Info Badges & Route Pill */
.screen-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.platform-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.platform-badge.Web {
  background: #FAF6F0;
  color: #7B5233;
  border-color: #EADCC9;
}

.platform-badge.Mobile {
  background: #7B5233;
  color: #FFFFFF;
  border-color: #7B5233;
}

.code-badge {
  display: inline-flex;
  align-items: center;
  background: #F8F5F1;
  border: 1px solid #EADCC9;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 700;
  color: #2D1A12;
  box-sizing: border-box;
}

.code-badge.modified {
  background: #FEF3C7;
  border-color: #FCD34D;
  color: #D97706;
}

.route-info-box {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #F8F5F1;
  border: 1px solid #EADCC9;
  padding: 5px 12px;
  border-radius: 6px;
  box-sizing: border-box;
}

.route-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #7B5233;
}

.route-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2D1A12;
}

/* Auto-sync Banner */
.auto-sync-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #E8F5E9, #F1F8E9);
  border: 1px solid #A5D6A7;
  border-left: 4px solid #43A047;
  border-radius: 8px;
  padding: 8px 16px;
  margin-bottom: 10px;
  font-size: 0.82rem;
  color: #2E7D32;
}

.sync-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* Toolbar */
.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  background: #FAF6F0;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #EADCC9;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-grow: 1;
}

.search-input-wrapper {
  position: relative;
  flex-grow: 1;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 11px 40px 11px 38px;
  border-radius: 8px;
  border: 1px solid #EADCC9;
  background: #F8F5F1;
  font-size: 0.9rem;
  color: #2D1A12;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #7B5233;
  outline: none;
  background: #FFF;
  box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
}

.btn-clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #4A2E20;
  opacity: 0.6;
}

.filter-select {
  padding: 11px 16px;
  border-radius: 8px;
  border: 1px solid #EADCC9;
  background: #F8F5F1;
  font-size: 0.9rem;
  color: #2D1A12;
  cursor: pointer;
  font-weight: 600;
}

.filter-select:focus {
  border-color: #7B5233;
  outline: none;
}

.result-count {
  font-size: 0.85rem;
  color: #7B5233;
  font-weight: 600;
  white-space: nowrap;
}

/* Component Grid & Cards */
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.component-card {
  background: #F8F5F1;
  border: 1px solid #EADCC9;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(123, 82, 51, 0.03);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.component-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(123, 82, 51, 0.08);
  border-color: #7B5233;
}

.comp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.comp-type-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.comp-type-badge.ui { background: #F5EBE6; color: #7B5233; }
.comp-type-badge.logic { background: #E6F2F5; color: #336B7B; }
.comp-type-badge.native { background: #F1F5E6; color: #6B7B33; }
.comp-type-badge.api { background: #F5E6F2; color: #7B336B; }

.comp-auto-tag {
  font-size: 0.7rem;
  font-weight: 700;
  color: #43A047;
  background: #E8F5E9;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.comp-name {
  margin: 0 0 10px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #2D1A12;
}

.comp-file-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #FAF6F0;
  border: 1px solid #EADCC9;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.file-icon { font-size: 0.85rem; }
.file-path {
  font-size: 0.75rem;
  color: #7B5233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comp-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-subtitle {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #7B5233;
  font-weight: 700;
}

.comp-desc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #4A2E20;
}

.comp-technical {
  background: #2D1A12;
  color: #EADCC9;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  border-left: 3px solid #7B5233;
}

/* Empty State */
.empty-components-card {
  background: #FAF6F0;
  border: 2px dashed #EADCC9;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  margin-bottom: 24px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-components-card h3 {
  margin: 0 0 8px 0;
  color: #2D1A12;
  font-size: 1.1rem;
}

.empty-components-card p {
  margin: 0 0 16px 0;
  color: #7B5233;
  font-size: 0.9rem;
}

.btn-reset-filters {
  background: #7B5233;
  color: #F8F5F1;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-reset-filters:hover {
  background: #2D1A12;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace !important;
}

.loading-state, .error-card {
  text-align: center;
  padding: 100px 30px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #EADCC9;
  border-top-color: #7B5233;
  border-radius: 50%;
  margin: 0 auto 16px auto;
  animation: spin 1s linear infinite;
}

.error-text {
  color: #EF4444;
  font-weight: 600;
  margin-bottom: 20px;
}

.btn-back {
  background: #7B5233;
  color: #F8F5F1;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ────────────────────────────────────────────────────────
   New Fluid Layout CSS (Coffee Luxury Theme) — 3 Column
   ──────────────────────────────────────────────────────── */
.detail-layout-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 24px;
  align-items: start;
}

/* 3-COLUMN LAYOUT: Components (trái) | Simulator (giữa) | Detail (phải) */
.detail-layout-grid {
  grid-template-columns: 260px 1fr 380px;
}

.detail-layout-grid .component-tree-pane,
.detail-layout-grid .detail-simulator-pane,
.detail-layout-grid .detail-inspector-pane {
  height: calc(100vh - 240px);
  min-height: 480px;
}

.detail-layout-grid .detail-simulator-pane {
  position: sticky;
  top: 90px;
}

/* RESPONSIVE CO DÃN KHI TRÌNH DUYỆT BỊ THU NHỎ */
@media (max-width: 1280px) {
  .detail-layout-grid {
    grid-template-columns: 240px 1fr 320px !important;
  }
}

@media (max-width: 1024px) {
  .detail-layout-grid {
    grid-template-columns: 1fr !important;
  }
  .detail-layout-grid .component-tree-pane,
  .detail-layout-grid .detail-simulator-pane,
  .detail-layout-grid .detail-inspector-pane {
    height: auto !important;
    position: relative !important;
    top: 0 !important;
  }
}

/* ── Component Tree Pane (Cột trái) ── */
.component-tree-pane {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(45, 26, 18, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.component-tree-pane .pane-header {
  padding: 12px 16px;
}

.tree-filter-box {
  padding: 10px 12px;
  border-bottom: 1px solid #F0E6D8;
  background: #FAF9F6;
}

.tree-search-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.tree-search-wrapper .search-icon-compact {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  opacity: 0.5;
}

.tree-search-input {
  width: 100%;
  padding: 7px 28px 7px 28px;
  border-radius: 6px;
  border: 1px solid #EADCC9;
  background: #FFFFFF;
  font-size: 0.78rem;
  color: #2D1A12;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.tree-search-input:focus {
  border-color: #7B5233;
  outline: none;
  box-shadow: 0 0 0 2px rgba(123, 82, 51, 0.1);
}

.tree-filter-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  background: #F0E6D8;
  padding: 2px;
  border-radius: 6px;
}

.tree-filter-btn {
  border: none;
  background: transparent;
  font-size: 0.68rem;
  font-weight: 700;
  color: #7B5233;
  padding: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.tree-filter-btn.active {
  background: #FFFFFF;
  color: #2D1A12;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Scrollable component tree list */
.tree-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.tree-group {
  margin-bottom: 6px;
}

.tree-group-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: #A08060;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 14px 2px;
}

/* Component item in tree */
.tree-comp-item {
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.tree-comp-item:hover {
  background: #FAF5EE;
}

.tree-comp-item.selected {
  background: #F4EBE1;
}

.tree-comp-item.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #7B5233;
  border-radius: 0 2px 2px 0;
}

.tree-comp-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.tree-comp-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tree-comp-dot[data-type="ui"] { background: #7B5233; }
.tree-comp-dot[data-type="logic"] { background: #336B7B; }
.tree-comp-dot[data-type="native"] { background: #6B7B33; }
.tree-comp-dot[data-type="api"] { background: #7B336B; }

.tree-comp-name {
  font-size: 0.76rem;
  color: #2D1A12;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tree-comp-check {
  font-size: 0.72rem;
  color: #7B5233;
  font-weight: bold;
  flex-shrink: 0;
}

/* Sub-elements (children of a component) */
.tree-sub-elements {
  padding: 4px 0 2px 27px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tree-sub-el {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.68rem;
  color: #7B5233;
  padding: 2px 0;
  opacity: 0.85;
}

.tree-sub-el-icon {
  font-size: 0.72rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.tree-sub-el-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-empty {
  padding: 20px;
  text-align: center;
  font-style: italic;
  font-size: 0.75rem;
  color: #888;
}

/* ── Simulator Pane (Cột giữa) ── */
.detail-simulator-pane {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(45, 26, 18, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* ── Detail Inspector Pane (Cột phải) ── */
.detail-inspector-pane {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(45, 26, 18, 0.03);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pane-header {
  background: #FAF6F0;
  border-bottom: 1px solid #EADCC9;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pane-icon {
  font-size: 1.1rem;
}

.pane-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: #2D1A12;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.simulator-wrapper {
  padding: 15px;
  background: #FAF8F5;
  display: block; /* Đổi sang block để tránh lỗi co rúm chiều rộng flexbox */
  width: 100%;
  flex-grow: 1;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

/* ────────────────────────────────────────────────────────
   Master-Detail Component Inspector Layout
   ──────────────────────────────────────────────────────── */
.inspector-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #FAF8F5;
}

/* MASTER SIDEBAR LIST */
.inspector-master-list {
  width: 240px;
  border-right: 1px solid #EADCC9;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  flex-shrink: 0;
}

/* Bộ lọc & tìm kiếm nhỏ gọn của Master */
.inspector-master-filter-box {
  padding: 12px;
  border-bottom: 1px solid #F0E6D8;
  background: #FAF9F6;
}

.search-input-wrapper-compact {
  position: relative;
  margin-bottom: 8px;
}

.search-icon-compact {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  opacity: 0.5;
}

.search-input-compact {
  width: 100%;
  padding: 7px 28px 7px 26px;
  border-radius: 6px;
  border: 1px solid #EADCC9;
  background: #FFFFFF;
  font-size: 0.8rem;
  color: #2D1A12;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.search-input-compact:focus {
  border-color: #7B5233;
  outline: none;
  box-shadow: 0 0 0 2px rgba(123, 82, 51, 0.1);
}

.btn-clear-search-compact {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #7B5233;
  opacity: 0.6;
}

.filter-tabs-compact {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  background: #F0E6D8;
  padding: 2px;
  border-radius: 6px;
}

.filter-tab-compact-btn {
  border: none;
  background: transparent;
  font-size: 0.7rem;
  font-weight: 700;
  color: #7B5233;
  padding: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.filter-tab-compact-btn.active {
  background: #FFFFFF;
  color: #2D1A12;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Vùng scroll danh sách master */
.inspector-master-scroll-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.master-group-section {
  margin-bottom: 12px;
}

.master-group-header {
  font-size: 0.68rem;
  font-weight: 800;
  color: #A08060;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 14px;
}

.master-list-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  gap: 8px;
}

.master-list-item:hover {
  background: #FAF5EE;
}

.master-list-item.selected {
  background: #F4EBE1;
  font-weight: 700;
}

.master-list-item.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3.5px;
  background: #7B5233;
}

.item-type-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-type-dot[data-type="ui"] { background: #7B5233; }
.item-type-dot[data-type="logic"] { background: #336B7B; }
.item-type-dot[data-type="native"] { background: #6B7B33; }
.item-type-dot[data-type="api"] { background: #7B336B; }

.item-name {
  font-size: 0.78rem;
  color: #2D1A12;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.item-active-check {
  font-size: 0.75rem;
  color: #7B5233;
  font-weight: bold;
}

.empty-master-list {
  padding: 20px;
  text-align: center;
  font-style: italic;
  font-size: 0.75rem;
  color: #888;
}

/* DETAIL VIEW PANEL */
.inspector-detail-view {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #FAF8F5;
}

.empty-detail-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #A08060;
  text-align: center;
  padding: 40px;
}

.empty-detail-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.7;
}

.empty-detail-state p {
  font-size: 0.82rem;
  max-width: 280px;
  line-height: 1.4;
}

/* Chi tiết component active */
.component-detail-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 0.25s ease-out;
}

.comp-detail-header-card {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(123, 82, 51, 0.02);
}

.comp-detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comp-detail-name {
  margin: 0 0 10px 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #2D1A12;
}

.comp-detail-file-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAF6F0;
  border: 1px solid #EADCC9;
  padding: 6px 12px;
  border-radius: 6px;
}

.btn-copy-path {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  color: #7B5233;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-left: auto;
}

.btn-copy-path:hover {
  background: #7B5233;
  color: #FFFFFF;
  border-color: #7B5233;
}

.comp-detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Sub-elements detail list (Right panel) */
.sub-elements-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-el-detail-card {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.sub-el-detail-card:hover {
  border-color: #7B5233;
  box-shadow: 0 2px 8px rgba(123, 82, 51, 0.06);
}

.sub-el-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sub-el-detail-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.sub-el-detail-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #2D1A12;
}

.sub-el-detail-desc {
  font-size: 0.72rem;
  color: #4A2E20;
  line-height: 1.4;
  margin-bottom: 4px;
  padding-left: 26px;
}

.sub-el-detail-handler {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-left: 26px;
}

.handler-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: #7B5233;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 1px;
}

.handler-code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.65rem;
  color: #336B7B;
  background: #F0F4F5;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.4;
  word-break: break-all;
}

.detail-section-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #8C6239;
  letter-spacing: 0.5px;
  border-left: 3px solid #7B5233;
  padding-left: 8px;
}

.detail-desc-box {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.85rem;
  line-height: 1.45;
  color: #4A2E20;
}

.detail-code-box {
  background: #FFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-code-header {
  font-size: 0.78rem;
  font-weight: 700;
  color: #7B5233;
}

.detail-code-desc {
  font-size: 0.78rem;
  color: #4A2E20;
  line-height: 1.4;
}

.code-snippet-container {
  position: relative;
  margin-top: 4px;
}

.btn-copy-code {
  position: absolute;
  right: 8px;
  top: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #EADCC9;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
}

.btn-copy-code:hover {
  background: #7B5233;
  color: #FFFFFF;
}

.detail-code-snippet {
  background: #1E1E1E !important;
  color: #A9B7C6 !important;
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 0.7rem;
  overflow-x: auto;
  margin: 0;
  border-left: 3px solid #7B5233;
}

.detail-sandbox-box {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 14px;
}

.sandbox-info-text {
  margin: 0 0 10px 0;
  font-size: 0.75rem;
  color: #7B5233;
  font-style: italic;
}

.inspector-toolbar {
  margin: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #EADCC9;
  background: #FAF6F0;
  padding: 8px 12px;
}

.inspector-list-scroll {
  flex-grow: 1;
  overflow-y: auto;
  padding: 12px;
  background: #FAF8F5;
  min-height: 0;
  max-height: calc(600px - 120px);
}

.components-list-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vertical-card {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid #EADCC9;
  padding: 14px 16px;
  background: #FFFFFF;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(123, 82, 51, 0.02);
}

.vertical-card:hover {
  border-color: #7B5233;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(123, 82, 51, 0.06);
}

/* Two-way Highlight Classes */
.component-card.active-highlight {
  border-color: #7B5233;
  border-width: 1.5px;
  background: #FFFDFC;
  box-shadow: 0 4px 15px rgba(123, 82, 51, 0.1);
}

.component-card.hovered-highlight {
  border-color: #C49A70;
  background: #FAF8F5;
}

.active-dot {
  font-size: 0.7rem;
  font-weight: 700;
  color: #FAF6F0;
  background: #4A2E20;
  padding: 2px 8px;
  border-radius: 4px;
}

.desktop-inline {
  display: inline;
}

.mobile-inline {
  display: none;
}

/* View Mode Tab Buttons - Clean & Premium for White Background */
.view-mode-tabs {
  display: flex;
  background: #FAF6F0;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #EADCC9;
  margin-right: 10px;
}

.view-mode-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: 0.8rem;
  color: #7B5233;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.view-mode-btn.active {
  background: #7B5233;
  color: #FFFFFF;
  box-shadow: 0 2px 6px rgba(123, 82, 51, 0.2);
}

.view-mode-btn:hover:not(.active) {
  background: rgba(123, 82, 51, 0.08);
  color: #2D1A12;
}

.empty-components-card.small {
  padding: 30px 16px;
  margin-bottom: 0;
}

/* Blueprint overlay mode */
.blueprint-toggle-btn {
  background: #FAF6F0;
  border: 1px solid #7B5233;
  color: #7B5233;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.blueprint-toggle-btn:hover, .blueprint-toggle-btn.active {
  background: #7B5233;
  color: #FFF;
}

.simulation-blueprint-active [data-comp-name] {
  border: 1.5px dashed #7B5233 !important;
  background-color: rgba(123, 82, 51, 0.05) !important;
  position: relative !important;
}

.simulation-blueprint-active [data-comp-name]::after {
  content: attr(data-comp-name);
  position: absolute;
  top: -9px;
  left: 4px;
  background: #7B5233;
  color: #FFF;
  font-size: 8px;
  font-family: monospace;
  padding: 0 4px;
  border-radius: 3px;
  line-height: 10px;
  white-space: nowrap;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* Walkthrough widget */
.walkthrough-widget {
  background: #FAF6F0;
  border-bottom: 1px solid #EADCC9;
  padding: 12px 20px;
  animation: fadeIn 0.3s ease;
}

.walkthrough-bar-title {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #2D1A12;
  margin-bottom: 6px;
}

.walkthrough-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #7B5233;
}

.walkthrough-step-desc {
  background: #FFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.85rem;
  color: #4A2E20;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.step-num-badge {
  background: #7B5233;
  color: #FFF;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.step-action-tag {
  background: #EADCC9;
  color: #4A2E20;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.walkthrough-actions {
  display: flex;
  gap: 10px;
}

.walkthrough-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #EADCC9;
  background: #FFF;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.walkthrough-btn:hover:not(:disabled) {
  background: #FAF6F0;
  border-color: #7B5233;
}

.walkthrough-btn.primary {
  background: #7B5233;
  color: #FFF;
  border-color: #7B5233;
}

.walkthrough-btn.primary:hover {
  background: #2D1A12;
}

/* Scenarios section */
.scenarios-section {
  padding: 12px 16px;
  border-bottom: 1px solid #EADCC9;
  background: #FAF8F5;
}

/* Logic & API Services section */
.logic-api-section {
  padding: 14px 16px;
  border-bottom: 1px solid #EADCC9;
  background: #FAF8F5;
}

.logic-api-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.logic-api-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}

.logic-api-pill.service-pill {
  background: #E6F2F5;
  color: #336B7B;
  border-color: #B8D4DE;
}

.logic-api-pill.api-pill {
  background: #F5E6F2;
  color: #7B336B;
  border-color: #D8B8D0;
}

.logic-api-pill.native-pill {
  background: #F1F5E6;
  color: #6B7B33;
  border-color: #C8D8B0;
}

.logic-api-pill:hover {
  transform: translateY(-1.5px);
  box-shadow: 0 4px 10px rgba(123, 82, 51, 0.08);
}

.logic-api-pill.active {
  border-color: #7B5233;
  background: #7B5233;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(123, 82, 51, 0.25);
}

.logic-api-pill.hovered {
  background: #EADCC9;
  color: #2D1A12;
}

.pill-icon {
  font-size: 0.85rem;
}

.pill-name {
  font-size: 0.75rem;
}

.inspector-section-lbl {
  margin: 0 0 12px 0;
  font-size: 0.75rem;
  color: #7B5233;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scenarios-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.scenario-item-card {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scenario-item-card:hover {
  border-color: #7B5233;
  background: #FFFDFC;
  transform: translateY(-1.5px);
  box-shadow: 0 3px 8px rgba(123, 82, 51, 0.05);
}

.scen-card-title {
  font-weight: 700;
  font-size: 0.75rem;
  color: #2D1A12;
  margin-bottom: 2px;
}

.scen-card-desc {
  font-size: 0.65rem;
  color: #7B5233;
  line-height: 1.3;
}

/* Connections Data Flow */
.comp-flow-mapping {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: #FFFFFF;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #EADCC9;
}

.flow-pill-source {
  font-size: 0.68rem;
  font-weight: 700;
  color: #7B5233;
  background: #FAF6F0;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #EADCC9;
}

.flow-pill-dest {
  font-size: 0.68rem;
  font-weight: 700;
  color: #2D1A12;
  background: #EADCC9;
  padding: 3px 8px;
  border-radius: 4px;
}

.flow-arrow {
  font-size: 0.72rem;
  color: #7B5233;
}

/* API Sandbox Simulator styling */
.btn-run-sandbox {
  width: 100%;
  background: #FAF6F0;
  border: 1px solid #7B5233;
  color: #7B5233;
  padding: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-run-sandbox:hover {
  background: #7B5233;
  color: #FFF;
}

.sandbox-console-output {
  background: #1E1E1E;
  color: #A9B7C6;
  border-left: 3.5px solid #4CAF50;
  border-radius: 6px;
  padding: 10px;
  font-size: 0.68rem;
  line-height: 1.45;
  margin-top: 10px;
  white-space: pre-wrap;
  text-align: left;
  max-height: 160px;
  overflow-y: auto;
}

.console-line-url {
  color: #FFC66D;
  font-weight: 700;
  margin-bottom: 2px;
}

.console-line-req {
  color: #9876AA;
  margin-bottom: 4px;
}

.console-line-res {
  color: #A5C261;
}

/* Code view toggle styling */
.btn-toggle-code {
  width: 100%;
  background: #2D1A12;
  color: #FAF6F0;
  border: none;
  padding: 7px;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.btn-toggle-code:hover {
  background: #7B5233;
}

/* ────────────────────────────────────────────────────────
   Workflow Flowchart Styling (Coffee Luxury Theme)
   ──────────────────────────────────────────────────────── */
.workflow-graph-container {
  padding: 24px;
  background: #FAF8F5;
  min-height: 400px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
}

.workflow-step-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
}

.workflow-node-card {
  background: #FFFFFF;
  border: 1.5px solid #EADCC9;
  border-radius: 12px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(45, 26, 18, 0.04);
  cursor: pointer;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.workflow-node-card:hover {
  transform: translateY(-2px);
  border-color: #7B5233;
  box-shadow: 0 6px 16px rgba(123, 82, 51, 0.08);
}

.workflow-node-card.node-active {
  border-color: #4A2E20;
  border-width: 2.5px;
  background: #FAF6F0;
  box-shadow: 0 8px 24px rgba(74, 46, 32, 0.12);
}

.node-step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #7B5233;
  color: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
  transition: background 0.3s ease;
}

.workflow-node-card.node-active .node-step-circle {
  background: #4A2E20;
  transform: scale(1.1);
}

.node-content {
  flex-grow: 1;
}

.node-title {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #2D1A12;
}

.node-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #7B5233;
  line-height: 1.4;
}

.node-tags-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.node-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.node-tag.comp { background: #F5EBE6; color: #7B5233; }
.node-tag.api { background: #F5E6F2; color: #7B336B; }
.node-tag.logic { background: #E6F2F5; color: #336B7B; }

.workflow-connector-line {
  height: 36px;
  width: 2px;
  border-left: 2px dashed #EADCC9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px 0;
  position: relative;
}

.workflow-connector-line.pulse-active {
  border-left-color: #4A2E20;
  animation: flowPulse 1.2s infinite linear;
}

.connector-arrow {
  font-size: 0.6rem;
  color: #EADCC9;
  position: absolute;
  bottom: -6px;
  left: -5px;
}

.workflow-connector-line.pulse-active .connector-arrow {
  color: #4A2E20;
}

/* Right workflow inspector styles */
.workflow-inspect-details {
  animation: fadeIn 0.3s ease;
}

.wf-detail-title {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2D1A12;
}

.wf-detail-desc {
  margin: 0 0 16px 0;
  font-size: 0.88rem;
  color: #4A2E20;
  line-height: 1.45;
}

.wf-comp-pill, .wf-api-pill, .wf-logic-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 4px;
}

.wf-comp-pill { background: #F5EBE6; color: #7B5233; border: 1px solid #EADCC9; }
.wf-api-pill { background: #F5E6F2; color: #7B336B; border: 1px solid #EADCC9; }
.wf-logic-pill { background: #E6F2F5; color: #336B7B; border: 1px solid #EADCC9; }

@keyframes flowPulse {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

/* Khóa scroll trang chính ở chế độ song song trên Desktop */
@media (min-width: 1025px) {
  body:has(.detail-layout-grid) {
    overflow: hidden !important;
  }
  body:has(.detail-layout-grid) .detail-layout-grid {
    margin-bottom: 0 !important;
  }
}

/* ────────────────────────────────────────────────────────
   Inspector User vs Dev Tabs Styling
   ──────────────────────────────────────────────────────── */
.inspector-mode-toggle {
  display: flex;
  background: #F0E6D8;
  border-radius: 8px;
  padding: 3px;
  margin: 10px 20px 15px;
  gap: 2px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}

.inspector-toggle-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: #7B5233;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.inspector-toggle-btn.active {
  background: #FFFFFF;
  color: #2D1A12;
  box-shadow: 0 2px 6px rgba(123, 82, 51, 0.12);
}

.tab-content-user, .tab-content-dev {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* User Friendly elements card */
.sub-el-detail-card.user-friendly {
  border-left: 3px solid #7B5233;
  background: #FAF6F0;
}

.sub-el-detail-card.user-friendly .sub-el-detail-label {
  color: #4A2E20;
  font-weight: 700;
}

/* User Guide Scenarios Card */
.scenario-item-card.user-guide-scen {
  background: #FFFFFF;
  border: 1px solid #EADCC9;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.scenario-item-card.user-guide-scen:hover {
  border-color: #7B5233;
  background: #FAF6F0;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(123, 82, 51, 0.05);
}

.scenario-item-card.user-guide-scen .scen-card-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: #2D1A12;
}

.scenario-item-card.user-guide-scen .scen-card-desc {
  font-size: 0.78rem;
  color: #7B5233;
  margin: 4px 0 8px;
  line-height: 1.4;
}

.scenario-item-card.user-guide-scen .scen-card-action {
  font-size: 0.75rem;
  font-weight: 700;
  color: #7B5233;
  text-align: right;
}

/* Database Table Pills */
.db-tables-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0;
}

.db-table-pill {
  background: #FAF6F0;
  border: 1px solid #EADCC9;
  color: #7B5233;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.db-table-pill.empty {
  background: #F8F5F1;
  border-color: #EADCC9;
  color: #9E9E9E;
  font-style: italic;
}

/* APIs list container */
.apis-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.api-endpoint-pill {
  background: #FAF6F0;
  border: 1px solid #EADCC9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  overflow: hidden;
  font-size: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.api-method-badge {
  background: #7B336B;
  color: #FFFFFF;
  padding: 6px 10px;
  font-weight: 800;
  font-size: 0.68rem;
  min-width: 60px;
  text-align: center;
}

.api-path-text {
  padding: 6px 12px;
  color: #2D1A12;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Detailed tables inside dev spec tab */
.dev-db-table, .dev-api-params-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: 0.8rem;
  border: 1px solid #EADCC9;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(123, 82, 51, 0.05);
}

.dev-db-table th, .dev-api-params-table th {
  background: #F4EBE1;
  color: #4A2E20;
  text-align: left;
  padding: 8px 12px;
  font-weight: 700;
  border-bottom: 1px solid #EADCC9;
}

.dev-db-table td, .dev-api-params-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #F5EBE6;
  color: #4A2E20;
  vertical-align: middle;
}

.dev-db-table tr:last-child td, .dev-api-params-table tr:last-child td {
  border-bottom: none;
}

/* Badges */
.db-action-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.db-action-badge.read {
  background: #E8F8F5;
  color: #117864;
  border: 1px solid #A3E4D7;
}

.db-action-badge.write {
  background: #FDF2E9;
  color: #A04000;
  border: 1px solid #F5CBA7;
}

.param-req-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
}

.param-req-badge.yes {
  background: #FADBD8;
  color: #78281F;
  border: 1px solid #F1948A;
}

.param-req-badge.no {
  background: #EAEDED;
  color: #5D6D7E;
  border: 1px solid #D5DBDB;
}

/* API Document Block spacing */
.api-doc-block {
  margin-bottom: 16px;
  border-bottom: 1px dashed #EADCC9;
  padding-bottom: 14px;
}

.api-doc-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* Helper class for mobile only elements */
.mobile-only {
  display: none !important;
}

@media (max-width: 768px) {
  .mobile-only {
    display: flex !important;
  }

  /* Make page fit screen without global scroll */
  .dashboard-content:has(.detail-container) {
    padding: 8px 10px !important;
    height: calc(100vh - 64px) !important;
    overflow: hidden !important;
  }

  .detail-container {
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  /* Hide auto-sync banner or make it extremely compact on mobile */
  .auto-sync-banner {
    padding: 6px 12px !important;
    margin-bottom: 8px !important;
    font-size: 0.72rem !important;
  }

  /* Toolbar styling for mobile */
  .mgmt-toolbar {
    flex-direction: column !important;
    align-items: stretch !important;
    padding: 8px 12px !important;
    margin-bottom: 8px !important;
    gap: 8px !important;
  }

  .toolbar-left, .toolbar-right {

    width: 100% !important;

    justify-content: space-between !important;

  }



  .desktop-inline {

    display: none !important;

  }



  .mobile-inline {

    display: inline !important;

  }



  .toolbar-right {

    display: flex !important;

    width: 100% !important;

    margin: 0 !important;

    padding: 0 !important;

  }



  .view-mode-tabs {

    display: grid !important;

    grid-template-columns: repeat(3, 1fr) !important;

    width: 100% !important;

    margin-right: 0 !important;

    gap: 4px !important;

    padding: 3px !important;

    box-sizing: border-box !important;

    background: #FAF6F0 !important;

    border: 1px solid #EADCC9 !important;

    border-radius: 8px !important;

  }



  .view-mode-btn {

    padding: 6px 2px !important;

    font-size: 0.74rem !important;

    text-align: center !important;

    white-space: nowrap !important;

    overflow: hidden !important;

    text-overflow: ellipsis !important;

    display: block !important;

    width: 100% !important;

  }

  .screen-info {
    flex-wrap: wrap !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .platform-badge, .code-badge, .route-info-box {
    padding: 4px 8px !important;
    font-size: 0.7rem !important;
  }

  /* Mobile sub-tabs selector */
  .mobile-pane-tabs {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 6px !important;
    background: #FAF6F0 !important;
    padding: 4px !important;
    border-radius: 8px !important;
    border: 1px solid #EADCC9 !important;
    margin-bottom: 8px !important;
  }

  .mobile-pane-tab {
    background: transparent;
    border: none;
    padding: 8px 4px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #7B5233;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .mobile-pane-tab.active {
    background: #7B5233;
    color: #FFFFFF;
    box-shadow: 0 2px 4px rgba(123, 82, 51, 0.2);
  }

  /* Detail Grid on mobile */
  .detail-layout-grid {
    grid-template-columns: 1fr !important;
    gap: 0 !important;
    margin-bottom: 0 !important;
    flex-grow: 1 !important;
    overflow: hidden !important;
  }

  /* Hide inactive panes and make active pane full height with scroll */
  .detail-layout-grid .mobile-hidden {
    display: none !important;
  }

  .detail-layout-grid .mobile-active {
    display: flex !important;
    flex-direction: column !important;
    height: calc(100vh - 270px) !important;
    min-height: auto !important;
    border-radius: 12px !important;
    overflow-y: auto !important;
    background: #FFFFFF !important;
    box-shadow: 0 4px 12px rgba(45, 26, 18, 0.05) !important;
  }

  /* Specific pane adjustments for mobile */
  .component-tree-pane {
    height: calc(100vh - 270px) !important;
  }

  .detail-simulator-pane {
    height: calc(100vh - 270px) !important;
    position: relative !important;
    top: 0 !important;
  }

  .detail-inspector-pane {
    height: calc(100vh - 270px) !important;
  }

  .tree-scroll-area {
    flex-grow: 1 !important;
    overflow-y: auto !important;
  }
}
` }} />
    </div>

  );

};



export default ScreenDetail;

