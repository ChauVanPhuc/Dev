import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { Bug, Play, Type, Table2, CheckSquare, List, Layout, Menu, CreditCard, Sliders, Bell, Component, MoreVertical } from 'lucide-react';
import api from '@webShared/Services/api.service';

const renderComponentIcon = (type) => {
  const props = { size: 16, style: { color: '#7B5233' } };
  switch (type) {
    case 'Button':
      return <Play {...props} />;
    case 'Input Field':
      return <Type {...props} />;
    case 'Table':
      return <Table2 {...props} />;
    case 'Checkbox / Radio':
      return <CheckSquare {...props} />;
    case 'Dropdown / Select':
      return <List {...props} />;
    case 'Modal / Dialog':
      return <Layout {...props} />;
    case 'Navbar / Sidebar':
      return <Menu {...props} />;
    case 'Card':
      return <CreditCard {...props} />;
    case 'Carousel / Slider':
      return <Sliders {...props} />;
    case 'Toast / Alert':
      return <Bell {...props} />;
    default:
      return <Component {...props} />;
  }
};

const CATEGORIES = [
  { key: 'UI Component', label: 'UI Component', icon: '📂' },
  { key: 'Logic / Service', label: 'Logic / Service', icon: '⚙️' },
  { key: 'API Endpoint', label: 'API Endpoint', icon: '🔗' },
  { key: 'Native API', label: 'Native API', icon: '📱' }
];

const getComponentCategory = (comp) => {
  const type = comp.type || '';
  if (['Button', 'Input Field', 'Checkbox / Radio', 'Dropdown / Select', 'Modal / Dialog', 'Navbar / Sidebar', 'Card', 'Table', 'Carousel / Slider', 'Toast / Alert', 'UI Component'].includes(type)) {
    return 'UI Component';
  }
  if (['Logic / Service', 'Business Logic', 'Service'].includes(type) || type.toLowerCase().includes('service') || type.toLowerCase().includes('logic')) {
    return 'Logic / Service';
  }
  if (['API Endpoint', 'API', 'Web Service'].includes(type) || type.toLowerCase().includes('api')) {
    return 'API Endpoint';
  }
  if (['Native API', 'Native', 'Device'].includes(type)) {
    return 'Native API';
  }
  return 'UI Component';
};

const getLoggedInUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
    return user.full_name || user.username || 'Phúc';
  } catch {
    return 'Phúc';
  }
};

const getBugStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'new' || s === 'mới') return 'Mới';
  if (s === 'resolved' || s === 'đã sửa') return 'Đã sửa';
  if (s === 'verified' || s === 'hoàn thành') return 'Hoàn thành';
  if (s === 'reopened' || s === 'sửa lại' || s === 'in progress' || s === 'in_progress') return 'Sửa lại';
  return status;
};

import { screenService } from '@modules/System/Models/screen.service';
import { bugService } from '@modules/System/Models/bug.service';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';

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



const getComponentHint = (comp) => {
  const type = comp.type || 'Khác';
  const name = (comp.name || '').toLowerCase();

  if (type === 'Button') return 'Nút bấm kích hoạt hành động.';
  if (type === 'Input Field') return 'Ô nhập dữ liệu văn bản.';
  if (type === 'Checkbox / Radio') return 'Hộp chọn một hoặc nhiều mục.';
  if (type === 'Dropdown / Select') return 'Menu danh sách thả xuống.';
  if (type === 'Modal / Dialog') return 'Cửa sổ thông báo bật lên.';
  if (type === 'Navbar / Sidebar') return 'Thanh điều hướng trang web.';
  if (type === 'Card') return 'Thẻ chứa hình ảnh và thông tin.';
  if (type === 'Table') return 'Bảng hiển thị dữ liệu cột.';
  if (type === 'Carousel / Slider') return 'Trình trình chiếu ảnh chạy qua lại.';
  if (type === 'Toast / Alert') return 'Thanh thông báo nhanh góc màn hình.';
  if (type === 'Khác') return 'Không tồn tại trong các sự lựa chọn trên.';

  // Fallback for legacy database records
  if (type === 'UI Component') {
    if (name.includes('button') || name.includes('btn') || name.includes('submit')) return 'Nút bấm kích hoạt hành động.';
    if (name.includes('input') || name.includes('text') || name.includes('field')) return 'Ô nhập dữ liệu văn bản.';
    if (name.includes('checkbox') || name.includes('radio') || name.includes('select-all')) return 'Hộp chọn một hoặc nhiều mục.';
    if (name.includes('dropdown') || name.includes('select') || name.includes('combobox')) return 'Menu danh sách thả xuống.';
    if (name.includes('modal') || name.includes('dialog') || name.includes('popup')) return 'Cửa sổ thông báo bật lên.';
    if (name.includes('navbar') || name.includes('sidebar') || name.includes('menu')) return 'Thanh điều hướng trang web.';
    if (name.includes('card') || name.includes('box')) return 'Thẻ chứa hình ảnh và thông tin.';
    if (name.includes('table') || name.includes('grid') || name.includes('list')) return 'Bảng hiển thị dữ liệu cột.';
    if (name.includes('carousel') || name.includes('slider') || name.includes('slideshow')) return 'Trình trình chiếu ảnh chạy qua lại.';
    if (name.includes('toast') || name.includes('alert') || name.includes('notification')) return 'Thanh thông báo nhanh góc màn hình.';
  }
  return 'Không tồn tại trong các sự lựa chọn trên.';
};

const parseDescription = (desc) => {
  if (!desc) return { tag: '', text: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return { tag: match[1], text: match[2] };
  }
  return { tag: '', text: desc };
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${apiBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

const getPositionByName = (name) => {
  if (!name) return 'QC';
  const n = name.toLowerCase();
  if (n.includes('admin') || n.includes('it') || n.includes('hệ thống') || n.includes('administrator')) return 'Admin';
  if (n.includes('phuc') || n.includes('dev') || n.includes('coder') || n.includes('developer') || n.includes('phucv1')) return 'Lập trình viên';
  if (n.includes('qc') || n.includes('tester') || n.includes('kiem thu') || n.includes('nguyễn văn') || n.includes('phuong')) return 'QC';
  return 'QC';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const getSubsystem = (screen) => {
  if (!screen || !screen.current_code) return 'Quản lý hệ thống';
  const prefix = screen.current_code.substring(0, 2).toUpperCase();
  const mapping = {
    'TC': 'Trang chủ',
    'HD': 'Quản lý hệ thống',
    'NS': 'Quản lý nhân sự',
    'SX': 'Quản lý sản xuất',
    'CL': 'Quản lý chất lượng',
    'KD': 'Quản lý kinh doanh',
    'KT': 'Quản lý kỹ thuật',
    'BT': 'Bảo trì - cơ sở hạ tầng'
  };
  return mapping[prefix] || 'Quản lý hệ thống';
};

const SUBSYSTEM_PREFIXES = {
  'Trang chủ': 'TC',
  'Quản lý hệ thống': 'AD',
  'Quản lý nhân sự': 'NS',
  'Quản lý sản xuất': 'MA',
  'Quản lý chất lượng': 'CL',
  'Quản lý kinh doanh': 'KD',
  'Quản lý kỹ thuật': 'KT',
  'Bảo trì - cơ sở hạ tầng': 'BT'
};

const generateNextScreenCode = (subsystemName, screensList) => {
  const prefix = SUBSYSTEM_PREFIXES[subsystemName] || 'AD';
  const matchingCodes = (screensList || [])
    .map(s => s.current_code || s.default_code || '')
    .filter(code => code.startsWith(prefix));

  let maxSeq = 0;
  matchingCodes.forEach(code => {
    const numPart = code.substring(prefix.length);
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  });

  const nextSeq = maxSeq + 1;
  const bb = String(nextSeq).padStart(2, '0');
  return `${prefix}${bb}`;
};

const ScreenDetail = () => {

  const { id } = useParams();
  const location = useLocation();

  const navigate = useNavigate();
  const { toast } = useToast();

  const outletContext = useOutletContext() || {};

  const { showModal, startGlobalUpload, activeUploads, setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const [screen, setScreen] = useState(null);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Đặc tả màn hình');
  }, [setCustomTitle]);

  useEffect(() => {
    if (screen) {
      if (setCustomSubtitle) setCustomSubtitle(`${screen.current_code}: ${screen.title}`);
      if (setCustomScreenCode) setCustomScreenCode(screen.current_code);
    } else {
      if (setCustomSubtitle) setCustomSubtitle('Đặc tả màn hình chi tiết');
      if (setCustomScreenCode) setCustomScreenCode('HD03');
    }
  }, [screen, setCustomSubtitle, setCustomScreenCode]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    route_path: '',
    platform: 'Web',
    subsystem: 'Quản lý hệ thống',
    status: 'Mới thiết kế',
    target_date: '',
    subtitle: ''
  });

  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isMockupExpanded, setIsMockupExpanded] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentType, setNewComponentType] = useState('Button');
  const [newComponentFrontend, setNewComponentFrontend] = useState('');
  const [newComponentWorkflow, setNewComponentWorkflow] = useState('');
  const [newComponentBackend, setNewComponentBackend] = useState('');
  const [specDescriptions, setSpecDescriptions] = useState({
    Frontend: '',
    'Luồng xử lý': '',
    Backend: ''
  });

  const [currentMockupIdx, setCurrentMockupIdx] = useState(0);
  const [expandedBugId, setExpandedBugId] = useState(null);
  const [isBugListCollapsed, setIsBugListCollapsed] = useState(false);
  const [allScreens, setAllScreens] = useState([]);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugModalData, setBugModalData] = useState({
    componentName: 'Chung',
    severity: 'Medium',
    description: '',
    reporter: getLoggedInUser(),
    assignee: 'IT',
    targetDate: '',
    imagePath: ''
  });
  const [bugModalMode, setBugModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugImageUploading, setBugImageUploading] = useState(false);
  const [replyNotes, setReplyNotes] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [replyUploading, setReplyUploading] = useState(false);
  const [replyStatusVal, setReplyStatusVal] = useState('');
  const [itAccounts, setItAccounts] = useState(['IT']);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmModal({
      visible: true,
      title,
      message,
      onConfirm: () => {
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
        setConfirmModal(prev => ({ ...prev, visible: false }));
      },
      type
    });
  };

  const [activeTab, setActiveTab] = useState('components');
  const [selectedGuideIdx, setSelectedGuideIdx] = useState(0);
  const [isGuideCompDropdownOpen, setIsGuideCompDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchItAccounts = async () => {
      try {
        const res = await api.get('/accounts/?size=100');
        if (res && res.items) {
          const filtered = res.items
            .filter(acc => {
              const role = (acc.role_name || '').toLowerCase();
              return role === 'it' || role.includes('it');
            })
            .map(acc => acc.full_name || acc.username);
          if (filtered.length > 0) {
            setItAccounts(filtered);
          }
        }
      } catch (err) {
        console.error('Failed to load IT accounts:', err);
      }
    };
    fetchItAccounts();
  }, []);

  // States for search and filter

  const [searchQuery, setSearchQuery] = useState('');

  const [typeFilter, setTypeFilter] = useState('All');



  // States for interactive simulation

  const [activeComponent, setActiveComponent] = useState(null);

  const [hoveredComponent, setHoveredComponent] = useState(null);

  const [activeComponentMenu, setActiveComponentMenu] = useState(null);

  const [activeBugMenu, setActiveBugMenu] = useState(null);



  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.comp-action-btn') && !e.target.closest('.action-menu')) {
          setActiveComponentMenu(null);
        }
        if (!e.target.closest('.bug-action-btn') && !e.target.closest('.action-menu')) {
          setActiveBugMenu(null);
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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

  const showToast = (message, type = 'success') => {
    toast(type, message);
  };

  const fetchScreenDetail = async () => {
    try {
      const screensList = await screenService.getScreens();
      setAllScreens(screensList || []);
    } catch (err) {
      console.error('Failed to load all screens list:', err);
    }

    if (id === 'new') {
      const copyData = location.state?.copyFromScreen;
      if (copyData) {
        setScreen({
          id: 'new',
          title: copyData.title ? `${copyData.title} - Sao chép` : '',
          route_path: copyData.route_path ? `${copyData.route_path}-copy` : '',
          platform: copyData.platform || 'Web',
          status: 'Mới thiết kế',
          target_date: copyData.target_date || '',
          subtitle: copyData.subtitle || '',
          components: (copyData.components || []).map((c, idx) => ({
            id: idx + 1,
            name: c.name,
            type: c.type,
            description: c.description || '',
            technical_details: c.technical_details || '',
            file_path: c.file_path || '',
            is_active: c.is_active !== undefined ? c.is_active : true
          })),
          guides: (copyData.guides || []).map((g, idx) => ({
            step_number: g.step_number || (idx + 1),
            title: g.title,
            related_components: g.related_components || '',
            description: g.description || ''
          })),
          bugs: []
        });
      } else {
        setScreen({
          id: 'new',
          title: '',
          route_path: '',
          platform: 'Web',
          status: 'Mới thiết kế',
          target_date: '',
          components: [
            { id: 1, name: 'Nút A', type: 'Button', description: 'Nút bấm kích hoạt hành động.' },
            { id: 2, name: 'Ô nhập liệu A', type: 'Input Field', description: 'Ô nhập dữ liệu văn bản.' },
            { id: 3, name: 'Bảng A', type: 'Table', description: 'Bảng hiển thị dữ liệu cột.' },
            { id: 4, name: 'Nút radio B', type: 'Checkbox / Radio', description: 'Hộp chọn một hoặc nhiều mục.' }
          ],
          guides: [],
          bugs: []
        });
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await screenService.getScreenDetail(id);

      try {
        const bugsData = await bugService.getBugs();
        if (bugsData) {
          if (Array.isArray(bugsData)) {
            data.bugs = bugsData.filter(b => b.screen_id === data.id);
          } else if (Array.isArray(bugsData.items)) {
            data.bugs = bugsData.items.filter(b => b.screen_id === data.id);
          }
        }
      } catch (bugErr) {
        console.error('Failed to load bugs for screen detail:', bugErr);
      }

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
    if (screen) {
      setFormData({
        title: screen.title || '',
        route_path: screen.route_path || '',
        platform: screen.platform || 'Web',
        subsystem: getSubsystem(screen),
        status: screen.status || 'Mới thiết kế',
        target_date: screen.target_date || '',
        subtitle: screen.subtitle || ''
      });
    }
  }, [screen]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.route_path) {
      showToast('Vui lòng nhập đầy đủ Tên màn hình và Đường dẫn Route!', 'error');
      return;
    }

    if (!formData.target_date) {
      showToast('Vui lòng chọn ngày hoàn thành dự kiến!', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (formData.target_date < today) {
      showToast('Ngày hoàn thành dự kiến phải lớn hơn hoặc bằng ngày hiện tại!', 'error');
      return;
    }

    const componentsPayload = (screen?.components || []).map(c => ({
      name: c.name,
      type: c.type,
      description: c.description || '',
      technical_details: c.technical_details || '',
      file_path: c.file_path || '',
      is_active: c.is_active !== undefined ? c.is_active : true
    }));

    const guidesPayload = (screen?.guides || []).map(g => ({
      step_number: g.step_number,
      title: g.title,
      related_components: g.related_components || '',
      description: g.description || ''
    }));

    try {
      if (id === 'new') {
        const res = await screenService.createScreen({
          title: formData.title,
          route_path: formData.route_path,
          platform: formData.platform,
          status: formData.status || 'Mới thiết kế',
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          subsystem: formData.subsystem || 'Quản lý hệ thống',
          components: componentsPayload,
          guides: guidesPayload
        });
        showToast('Tạo mới đặc tả màn hình thành công!');
        navigate(`/admin/screens/${res.id}`);
      } else {
        await screenService.updateScreen(screen.id, {
          title: formData.title,
          route_path: formData.route_path,
          platform: formData.platform,
          status: formData.status,
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          mockup_path: screen.mockup_path,
          components: componentsPayload,
          guides: guidesPayload
        });
        showToast('Cập nhật đặc tả màn hình thành công!');
        fetchScreenDetail();
      }
    } catch (err) {
      showToast('Lưu đặc tả thất bại!', 'error');
    }
  };

  const handleCopyScreenDetail = () => {
    if (!screen || id === 'new') return;
    showConfirm(
      'Sao chép đặc tả màn hình',
      `Bạn có chắc chắn muốn sao chép cấu hình màn hình này thành một màn hình mới (không kèm ảnh mockup)?`,
      () => {
        const copyPayload = {
          title: formData.title,
          route_path: formData.route_path,
          platform: formData.platform,
          subsystem: formData.subsystem,
          status: 'Mới thiết kế',
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          components: screen.components,
          guides: screen.guides
        };
        navigate('/admin/screens/new', { state: { copyFromScreen: copyPayload } });
      },
      'warning'
    );
  };

  const handleMockupUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showToast('Đang tải lên hình ảnh...', 'info');
      const res = await bugService.uploadImage(file);
      if (res && res.url) {
        const mockups = screen.mockup_path ? screen.mockup_path.split(',').filter(Boolean) : [];
        const updatedMockups = [...mockups, res.url];
        const updatedPath = updatedMockups.join(',');

        if (id === 'new') {
          setScreen(prev => ({ ...prev, mockup_path: updatedPath }));
          setCurrentMockupIdx(updatedMockups.length - 1);
          showToast('Tải lên hình ảnh thành công!');
          return;
        }

        await screenService.updateScreen(screen.id, {
          title: formData.title,
          route_path: formData.route_path,
          platform: formData.platform,
          status: formData.status,
          target_date: formData.target_date,
          subtitle: formData.subtitle,
          mockup_path: updatedPath
        });

        showToast('Tải lên hình ảnh thành công!');
        setCurrentMockupIdx(updatedMockups.length - 1);
        fetchScreenDetail();
      }
    } catch (err) {
      showToast('Tải lên thất bại!', 'error');
    }
  };

  const handleDeleteMockup = () => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa hình ảnh này?',
      async () => {
        const mockups = screen.mockup_path ? screen.mockup_path.split(',').filter(Boolean) : [];
        const updatedMockups = mockups.filter((_, idx) => idx !== currentMockupIdx);
        const updatedPath = updatedMockups.join(',');

        if (id === 'new') {
          setScreen(prev => ({ ...prev, mockup_path: updatedPath }));
          setCurrentMockupIdx(0);
          showToast('Xóa hình ảnh thành công!');
          return;
        }

        try {
          await screenService.updateScreen(screen.id, {
            title: formData.title,
            route_path: formData.route_path,
            platform: formData.platform,
            status: formData.status,
            target_date: formData.target_date,
            subtitle: formData.subtitle,
            mockup_path: updatedPath
          });

          showToast('Xóa hình ảnh thành công!');
          setCurrentMockupIdx(0);
          fetchScreenDetail();
        } catch (err) {
          console.error(err);
          showToast('Xóa hình ảnh thất bại!', 'error');
        }
      }
    );
  };

  const handleBugImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setBugImageUploading(true);
      showToast('Đang tải lên ảnh lỗi...', 'info');
      const res = await bugService.uploadImage(file);
      if (res && res.url) {
        setBugModalData(prev => ({ ...prev, imagePath: res.url }));
        showToast('Tải lên hình ảnh lỗi thành công!');
      } else {
        showToast('Không nhận được đường dẫn ảnh!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh lỗi thất bại!', 'error');
    } finally {
      setBugImageUploading(false);
    }
  };

  const handleCreateBug = async () => {
    if (!bugModalData.description) {
      showToast('Vui lòng nhập mô tả lỗi!', 'error');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (bugModalData.targetDate && bugModalData.targetDate < todayStr) {
      showToast('Ngày yêu cầu hoàn thành không được là ngày quá khứ!', 'error');
      return;
    }
    try {
      const payload = {
        screen_id: screen.id,
        description: `[${bugModalData.componentName}] ${bugModalData.description}`,
        severity: bugModalData.severity,
        status: 'New',
        reporter: bugModalData.reporter,
        assignee: bugModalData.assignee,
        requested_at: bugModalData.targetDate ? `${bugModalData.targetDate}T12:00:00Z` : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        image_paths: bugModalData.imagePath ? [bugModalData.imagePath] : [],
        notes: ''
      };

      await bugService.createBug(payload);
      showToast('Khai báo lỗi thành công!');
      setShowBugModal(false);
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Khai báo lỗi thất bại!', 'error');
    }
  };

  const handleDeleteBug = (bugId) => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa lỗi này khỏi cơ sở dữ liệu?',
      async () => {
        try {
          await bugService.deleteBug(bugId);
          showToast('Xóa lỗi thành công!');
          fetchScreenDetail();
        } catch (err) {
          console.error(err);
          showToast('Xóa lỗi thất bại!', 'error');
        }
      }
    );
  };

  const handleOpenEditBugModal = (bug) => {
    setBugModalMode('edit');
    setSelectedBug(bug);

    const parsed = parseDescription(bug.description);

    setBugModalData({
      id: bug.id,
      componentName: parsed.tag || 'Chung',
      severity: bug.severity || 'Medium',
      description: parsed.text || '',
      reporter: bug.reporter || '',
      assignee: bug.assignee || 'IT',
      targetDate: bug.requested_at ? bug.requested_at.split('T')[0] : '',
      imagePath: bug.images && bug.images.length > 0 ? bug.images[0].image_path : '',
      status: bug.status || 'New'
    });

    setReplyNotes('');
    setReplyImages([]);
    setReplyStatusVal('');

    setShowBugModal(true);
  };

  const handleUpdateBug = async () => {
    if (!replyNotes.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi!', 'error');
      return;
    }

    let newStatus = bugModalData.status;
    const current = (bugModalData.status || '').toLowerCase();
    const isNewOrReopened = current === 'new' || current === 'mới' || current === 'sửa lại' || current === 'in progress' || current === 'in_progress';
    const isFixed = current === 'resolved' || current === 'đã sửa';

    if (isNewOrReopened) {
      if (replyStatusVal === 'Đã sửa') {
        newStatus = 'Đã sửa';
      }
    } else if (isFixed) {
      if (replyStatusVal === 'Hoàn thành') {
        newStatus = 'Hoàn thành';
      } else if (replyStatusVal === 'Từ chối') {
        newStatus = 'Sửa lại';
      }
    }

    try {
      const updatePayload = {
        severity: bugModalData.severity,
        assignee: bugModalData.assignee,
        status: newStatus,
        requested_at: bugModalData.targetDate ? `${bugModalData.targetDate}T12:00:00Z` : undefined
      };
      await bugService.updateBug(bugModalData.id, updatePayload);

      const replyPayload = {
        status: newStatus,
        notes: replyNotes,
        updater: getLoggedInUser(),
        image_paths: replyImages,
        assignee: bugModalData.assignee
      };
      await bugService.addBugUpdate(bugModalData.id, replyPayload);

      showToast('Cập nhật tiến độ lỗi thành công!');
      setShowBugModal(false);
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Cập nhật tiến độ lỗi thất bại!', 'error');
    }
  };

  const handleReplyImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setReplyUploading(true);
      showToast('Đang tải lên hình ảnh...', 'info');
      const uploadedPaths = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedPaths.push(res.url);
        }
      }
      setReplyImages(prev => [...prev, ...uploadedPaths]);
      showToast('Tải lên hình ảnh thành công!');
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh thất bại!', 'error');
    } finally {
      setReplyUploading(false);
    }
  };

  const handleSubmitReply = async (bug) => {
    if (!replyNotes.trim()) {
      showToast('Vui lòng nhập nội dung phản hồi!', 'error');
      return;
    }

    let newStatus = bug.status;
    const current = (bug.status || '').toLowerCase();

    if (current === 'new' || current === 'mới' || current === 'sửa lại') {
      if (replyStatusVal !== 'Đã sửa') {
        showToast('Vui lòng tích chọn trạng thái "Đã sửa" trước khi phản hồi!', 'error');
        return;
      }
      newStatus = 'Đã sửa';
    } else if (current === 'đã sửa' || current === 'resolved') {
      if (replyStatusVal !== 'Hoàn thành' && replyStatusVal !== 'Sửa lại') {
        showToast('Vui lòng tích chọn "Xác nhận (Hoàn thành)" hoặc "Từ chối (Sửa lại)"!', 'error');
        return;
      }
      newStatus = replyStatusVal === 'Hoàn thành' ? 'Hoàn thành' : 'Sửa lại';
    }

    try {
      const payload = {
        notes: replyNotes,
        status: newStatus,
        updater: 'Phúc',
        image_paths: replyImages,
        assignee: bug.assignee
      };

      await bugService.addBugUpdate(bug.id, payload);
      showToast('Cập nhật phản hồi thành công!');
      setReplyNotes('');
      setReplyImages([]);
      setReplyStatusVal('');
      fetchScreenDetail();
    } catch (err) {
      console.error(err);
      showToast('Gửi phản hồi thất bại!', 'error');
    }
  };

  const handleAddComponent = () => {
    setShowAddComponentModal(true);
    setNewComponentName('');
    setNewComponentType('Button');
    setNewComponentFrontend('');
    setNewComponentWorkflow('');
    setNewComponentBackend('');
  };

  const confirmAddComponent = () => {
    if (!newComponentName.trim()) {
      showToast('Tên component không được để trống!', 'error');
      return;
    }
    const newComp = {
      id: Date.now(),
      name: newComponentName.trim(),
      type: newComponentType,
      description: newComponentFrontend.trim() || 'Thành phần đặc tả giao diện',
      technical_details: JSON.stringify({
        frontend_description: newComponentFrontend.trim(),
        workflow_description: newComponentWorkflow.trim(),
        backend_description: newComponentBackend.trim()
      })
    };

    setScreen(prev => {
      if (!prev) return null;
      return {
        ...prev,
        components: [...(prev.components || []), newComp]
      };
    });

    setShowAddComponentModal(false);
    showToast('Đã thêm thành phần mới vào danh sách!');
  };

  const handleDeleteComponent = (compName) => {
    showConfirm(
      'Xóa thành phần đặc tả',
      `Bạn có chắc chắn muốn xóa thành phần "${compName}"? Các hướng dẫn sử dụng liên quan sẽ mất liên kết.`,
      () => {
        setScreen(prev => {
          if (!prev) return null;
          const updatedComponents = (prev.components || []).filter(c => c.name !== compName);
          const updatedGuides = (prev.guides || []).map(g => {
            if (g.related_components) {
              const comps = g.related_components.split(',').map(c => c.trim()).filter(c => c !== compName);
              return { ...g, related_components: comps.join(', ') };
            }
            return g;
          });
          return {
            ...prev,
            components: updatedComponents,
            guides: updatedGuides
          };
        });
        showToast(`Đã xóa thành phần "${compName}" khỏi danh sách tạm thời. Hãy nhấn "Lưu lại" để hoàn tất.`);
      },
      'danger'
    );
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



  const renderMetadataForm = () => {
    const isNew = id === 'new';
    const generatedCode = isNew ? generateNextScreenCode(formData.subsystem, allScreens) : '';
    return (
      <div className="card" style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Card Header with Inline Selects & Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #F1F5F9',
          paddingBottom: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Thông tin màn hình
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            {/* Phân hệ select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748B', fontWeight: '600', fontSize: '0.84rem' }}>Phân hệ:</span>
              <select
                value={formData.subsystem}
                onChange={(e) => setFormData(prev => ({ ...prev, subsystem: e.target.value }))}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none', fontWeight: '600', color: '#334155', fontSize: '0.82rem', backgroundColor: '#fff', height: '34px', cursor: 'pointer' }}
              >
                <option value="Trang chủ">Trang chủ</option>
                <option value="Quản lý hệ thống">Quản lý hệ thống</option>
                <option value="Quản lý nhân sự">Quản lý nhân sự</option>
                <option value="Quản lý sản xuất">Quản lý sản xuất</option>
                <option value="Quản lý chất lượng">Quản lý chất lượng</option>
                <option value="Quản lý kinh doanh">Quản lý kinh doanh</option>
                <option value="Quản lý kỹ thuật">Quản lý kỹ thuật</option>
                <option value="Bảo trì - cơ sở hạ tầng">Bảo trì - cơ sở hạ tầng</option>
              </select>
            </div>

            {/* Nền tảng select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748B', fontWeight: '600', fontSize: '0.84rem' }}>Nền tảng:</span>
              <select
                value={formData.platform}
                onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none', fontWeight: '600', color: '#334155', fontSize: '0.82rem', backgroundColor: '#fff', height: '34px', cursor: 'pointer' }}
              >
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            {/* Trạng thái select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748B', fontWeight: '600', fontSize: '0.84rem' }}>Trạng thái:</span>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', outline: 'none', fontWeight: '600', color: '#334155', fontSize: '0.82rem', backgroundColor: '#fff', height: '34px', cursor: 'pointer' }}
              >
                <option value="Mới thiết kế">Mới Thiết Kế</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>
            </div>

            {/* Actions group */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: '8px', backgroundColor: '#7B5233', borderColor: '#7B5233', color: '#fff', fontWeight: 'bold', height: '34px', cursor: 'pointer' }}
              >
                Lưu đặc tả
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleCopyScreenDetail}
                  style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: '8px', backgroundColor: '#5C4033', border: 'none', color: '#fff', fontWeight: 'bold', height: '34px', cursor: 'pointer' }}
                >
                  Sao chép
                </button>
              )}
              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultAssignee = itAccounts[0] || 'IT';
                    setBugModalMode('create');
                    setBugModalData({
                      componentName: 'Chung',
                      severity: 'Medium',
                      description: '',
                      reporter: getLoggedInUser(),
                      assignee: defaultAssignee,
                      targetDate: new Date().toISOString().split('T')[0],
                      imagePath: ''
                    });
                    setShowBugModal(true);
                  }}
                  style={{ padding: '6px 16px', fontSize: '0.82rem', borderRadius: '8px', backgroundColor: '#5C4033', border: 'none', color: '#fff', fontWeight: 'bold', height: '34px', cursor: 'pointer' }}
                >
                  + Báo lỗi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card Body - 4 columns (layout from second screenshot) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Mã màn hình</label>
            <input
              type="text"
              className="form-control"
              value={isNew ? generatedCode : (screen?.current_code || '')}
              disabled
              style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#64748B', fontWeight: '600', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Tên màn hình</label>
            <input
              type="text"
              className="form-control"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ví dụ: Giám sát nhiệt độ lò"
              required
              style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Đường dẫn</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>{formData.subsystem}/</span>
              <input
                type="text"
                className="form-control"
                value={formData.route_path}
                onChange={(e) => setFormData(prev => ({ ...prev, route_path: e.target.value }))}
                placeholder="users"
                required
                style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box', flex: 1 }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Ngày hoàn thành dự kiến</label>
            <input
              type="date"
              className="form-control"
              value={formData.target_date}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Full-width Mô tả at the bottom */}
        <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
          <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Mô tả</label>
          <input
            type="text"
            className="form-control"
            value={formData.subtitle}
            onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
            placeholder="Mô tả chức năng/vai trò..."
            required
            style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box', width: '100%' }}
          />
        </div>
      </div>
    );
  };

  const isModified = screen.current_code !== screen.default_code;

  return (
    <div className="detail-container fade-in" style={{ padding: '0 0 20px 0' }}>

      {/* 1. Top Metadata Form Card */}
      {renderMetadataForm()}

      {/* 2. Middle Row Split Grid Layout */}
      <div className="detail-row-grid" style={{
        display: 'grid',
        gridTemplateColumns: isMockupExpanded ? '1fr' : '280px 1fr',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'start'
      }}>

        {/* Left Column Card: Danh sách components / Hướng dẫn sử dụng */}
        {!isMockupExpanded && (
          <div className="card component-list-card" style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '590px'
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', marginBottom: '16px', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'components' ? '2px solid #7B5233' : '2px solid transparent',
                  color: activeTab === 'components' ? '#7B5233' : '#64748B',
                  fontWeight: activeTab === 'components' ? 'bold' : 'normal',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  outline: 'none'
                }}
              >
                Thành phần
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guides')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'guides' ? '2px solid #7B5233' : '2px solid transparent',
                  color: activeTab === 'guides' ? '#7B5233' : '#64748B',
                  fontWeight: activeTab === 'guides' ? 'bold' : 'normal',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  outline: 'none'
                }}
              >
                Hướng dẫn sử dụng
              </button>
            </div>

            {activeTab === 'components' ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                  {screen.components && screen.components.length > 0 ? (
                    screen.components.map(comp => (
                      <div
                        key={comp.id}
                        onClick={() => {
                          setActiveComponent(comp.name);
                          setSpecDescriptions(prev => ({
                            ...prev,
                            Frontend: `Đặc tả chi tiết Component [${comp.name}]:\n- Loại component: ${comp.type}\n- Gợi ý UI: ${getComponentHint(comp)}\n- Chi tiết: ${comp.description || 'Chưa cập nhật mô tả chi tiết.'}`
                          }));
                        }}
                        title={getComponentHint(comp)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: activeComponent === comp.name ? '#7B5233' : '#F1F5F9',
                          backgroundColor: activeComponent === comp.name ? '#FAF6F0' : '#FFF',
                          cursor: 'pointer',
                          marginBottom: '8px',
                          fontSize: '0.8rem',
                          fontWeight: activeComponent === comp.name ? 'bold' : 'normal',
                          transition: 'all 0.2s',
                          color: activeComponent === comp.name ? '#7B5233' : '#334155'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <span style={{ width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {renderComponentIcon(comp.type)}
                          </span>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{comp.name}</span>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="comp-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveComponentMenu(activeComponentMenu === comp.name ? null : comp.name);
                            }}
                            title="Thao tác"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.6,
                              padding: '4px',
                              color: '#7B5233',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeComponentMenu === comp.name && (
                            <div className="action-menu" style={{
                              position: 'absolute',
                              right: 0,
                              top: '24px',
                              zIndex: 100,
                              width: '120px',
                              backgroundColor: '#FFF',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              padding: '4px 0',
                              display: 'flex',
                              flexDirection: 'column',
                              opacity: 1,
                              animation: 'none'
                            }}>
                              <button
                                className="action-menu-item"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveComponentMenu(null);
                                  const defaultAssignee = itAccounts[0] || 'IT';
                                  setBugModalMode('create');
                                  setBugModalData({
                                    componentName: comp.name,
                                    severity: 'Medium',
                                    description: '',
                                    reporter: getLoggedInUser(),
                                    assignee: defaultAssignee,
                                    targetDate: new Date().toISOString().split('T')[0],
                                    imagePath: ''
                                  });
                                  setShowBugModal(true);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  fontSize: '0.78rem',
                                  textAlign: 'left',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: '#334155'
                                }}
                              >
                                Báo lỗi
                              </button>
                              <button
                                className="action-menu-item danger"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveComponentMenu(null);
                                  handleDeleteComponent(comp.name);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  fontSize: '0.78rem',
                                  textAlign: 'left',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: '#EF4444'
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                      Không có component nào.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddComponent}
                  style={{
                    background: 'transparent',
                    border: '1px dashed #7B5233',
                    color: '#7B5233',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '12px'
                  }}
                >
                  <span>+ Thêm thành phần</span>
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                  {screen.guides && screen.guides.length > 0 ? (
                    screen.guides.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        onClick={() => setSelectedGuideIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: selectedGuideIdx === idx ? '#7B5233' : '#F1F5F9',
                          backgroundColor: selectedGuideIdx === idx ? '#FAF6F0' : '#FFF',
                          cursor: 'pointer',
                          marginBottom: '8px',
                          fontSize: '0.8rem',
                          fontWeight: selectedGuideIdx === idx ? 'bold' : 'normal',
                          transition: 'all 0.2s',
                          color: selectedGuideIdx === idx ? '#7B5233' : '#334155'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <span style={{ width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            ⏩
                          </span>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            Bước {step.step_number || (idx + 1)}: {step.title || 'Hành động mới'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx > 0) {
                                setScreen(prev => {
                                  const list = [...(prev.guides || [])];
                                  const temp = list[idx];
                                  list[idx] = list[idx - 1];
                                  list[idx - 1] = temp;
                                  list.forEach((item, i) => { item.step_number = i + 1; });
                                  return { ...prev, guides: list };
                                });
                                setSelectedGuideIdx(idx - 1);
                              }
                            }}
                            disabled={idx === 0}
                            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 0.6, padding: '2px', fontSize: '0.7rem' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx < screen.guides.length - 1) {
                                setScreen(prev => {
                                  const list = [...(prev.guides || [])];
                                  const temp = list[idx];
                                  list[idx] = list[idx + 1];
                                  list[idx + 1] = temp;
                                  list.forEach((item, i) => { item.step_number = i + 1; });
                                  return { ...prev, guides: list };
                                });
                                setSelectedGuideIdx(idx + 1);
                              }
                            }}
                            disabled={idx === screen.guides.length - 1}
                            style={{ background: 'none', border: 'none', cursor: idx === screen.guides.length - 1 ? 'default' : 'pointer', opacity: idx === screen.guides.length - 1 ? 0.3 : 0.6, padding: '2px', fontSize: '0.7rem' }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              showConfirm(
                                'Xác nhận xóa',
                                `Bạn có chắc chắn muốn xóa bước "${step.title || 'bước này'}" khỏi tài liệu hướng dẫn?`,
                                () => {
                                  setScreen(prev => {
                                    const filtered = (prev.guides || []).filter((_, i) => i !== idx);
                                    filtered.forEach((item, i) => { item.step_number = i + 1; });
                                    return { ...prev, guides: filtered };
                                  });
                                  setSelectedGuideIdx(Math.max(0, idx - 1));
                                  showToast('Đã xóa bước hướng dẫn!');
                                }
                              );
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: '2px', fontSize: '0.7rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                      Chưa khai báo các bước hướng dẫn.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextStepNum = (screen.guides || []).length + 1;
                    const newStep = {
                      id: `temp_${Date.now()}`,
                      step_number: nextStepNum,
                      title: 'Hành động mới',
                      related_components: '',
                      description: ''
                    };
                    setScreen(prev => ({
                      ...prev,
                      guides: [...(prev.guides || []), newStep]
                    }));
                    setSelectedGuideIdx(nextStepNum - 1);
                    showToast('Đã thêm bước hướng dẫn mới!');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px dashed #7B5233',
                    color: '#7B5233',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: '12px'
                  }}
                >
                  <span>+ Thêm bước</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Right Column: Simulator/Mockup & Spec Tab Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Mockup Simulator Frame Card */}
          <div className="card mockup-carousel-card" style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            minHeight: isMockupExpanded ? '600px' : '340px',
            transition: 'all 0.3s ease-in-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '12px' }}>
              <span
                onClick={() => setIsMockupExpanded(!isMockupExpanded)}
                style={{
                  fontSize: '1.25rem',
                  color: '#7B5233',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: isMockupExpanded ? '#FAF6F0' : 'transparent',
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}
                title={isMockupExpanded ? "Thu nhỏ bản vẽ" : "Phóng to bản vẽ"}
              >
                ☰
              </span>
              <label htmlFor="mockup-file-upload-main" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '0.74rem', borderRadius: '6px', backgroundColor: '#7B5233', color: '#fff', fontWeight: 'bold', cursor: 'pointer', margin: 0 }}>
                + Thêm ảnh
              </label>
              <input type="file" id="mockup-file-upload-main" accept="image/*" onChange={handleMockupUpload} style={{ display: 'none' }} />
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F8FAFC',
              borderRadius: '8px',
              minHeight: isMockupExpanded ? '520px' : '240px',
              overflow: 'hidden',
              border: '1px solid #F1F5F9',
              transition: 'all 0.3s ease-in-out'
            }}>
              {screen.mockup_path ? (
                (() => {
                  const mockups = screen.mockup_path.split(',').filter(Boolean);
                  return (
                    <img
                      src={getImageUrl(mockups[currentMockupIdx])}
                      alt="Mockup design"
                      style={{
                        maxWidth: '100%',
                        maxHeight: isMockupExpanded ? '520px' : '250px',
                        objectFit: 'contain',
                        transition: 'all 0.3s ease-in-out'
                      }}
                    />
                  );
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#94A3B8' }}>
                  <span style={{ fontSize: '3rem' }}>🖼️</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>Chưa có hình ảnh bản vẽ thực tế</span>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {screen.mockup_path && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={currentMockupIdx === 0}
                    onClick={() => setCurrentMockupIdx(prev => prev - 1)}
                    style={{ padding: '3px 8px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    &lt;
                  </button>
                  {(() => {
                    const mockups = screen.mockup_path.split(',').filter(Boolean);
                    return mockups.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentMockupIdx(i)}
                        style={{
                          padding: '3px 7px',
                          border: '1px solid',
                          borderColor: currentMockupIdx === i ? '#7B5233' : '#E2E8F0',
                          background: currentMockupIdx === i ? '#7B5233' : '#fff',
                          color: currentMockupIdx === i ? '#fff' : '#334155',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {i + 1}
                      </button>
                    ));
                  })()}
                  <button
                    type="button"
                    disabled={(() => {
                      const mockups = screen.mockup_path.split(',').filter(Boolean);
                      return currentMockupIdx === mockups.length - 1;
                    })()}
                    onClick={() => setCurrentMockupIdx(prev => prev + 1)}
                    style={{ padding: '3px 8px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    &gt;
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteMockup}
                  style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>

          {/* Bottom Card: Thông tin đặc tả */}
          {!isMockupExpanded && (
            <div className="card spec-tabs-card" style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              {activeTab === 'guides' ? (
                <>
                  <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Thông tin đặc tả
                    </span>
                  </div>
                  {screen.guides && screen.guides.length > 0 && selectedGuideIdx >= 0 && selectedGuideIdx < screen.guides.length ? (
                    (() => {
                      const currentStep = screen.guides[selectedGuideIdx];
                      const selectedComps = currentStep.related_components ? currentStep.related_components.split(',').map(c => c.trim()).filter(Boolean) : [];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Bước</label>
                              <select
                                value={currentStep.step_number}
                                onChange={(e) => {
                                  const newNum = parseInt(e.target.value);
                                  setScreen(prev => {
                                    const list = [...(prev.guides || [])];
                                    const targetIdx = newNum - 1;
                                    const sourceIdx = selectedGuideIdx;
                                    const [removed] = list.splice(sourceIdx, 1);
                                    list.splice(targetIdx, 0, removed);
                                    list.forEach((item, i) => { item.step_number = i + 1; });
                                    return { ...prev, guides: list };
                                  });
                                  setSelectedGuideIdx(newNum - 1);
                                }}
                                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', height: '34px', boxSizing: 'border-box' }}
                              >
                                {(screen.guides || []).map((_, i) => (
                                  <option key={i + 1} value={i + 1}>Bước {i + 1}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Tên nội dung *</label>
                              <input
                                type="text"
                                value={currentStep.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScreen(prev => {
                                    const list = [...(prev.guides || [])];
                                    list[selectedGuideIdx] = { ...list[selectedGuideIdx], title: val };
                                    return { ...prev, guides: list };
                                  });
                                }}
                                placeholder="Tên nội dung / hành động..."
                                required
                                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', boxSizing: 'border-box', outline: 'none', height: '34px' }}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                            <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Các thành phần liên quan</label>
                            <div
                              onClick={() => setIsGuideCompDropdownOpen(!isGuideCompDropdownOpen)}
                              style={{
                                width: '100%',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                backgroundColor: '#FFF',
                                cursor: 'pointer',
                                minHeight: '34px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                                {selectedComps.length > 0 ? (
                                  selectedComps.map(c => (
                                    <span
                                      key={c}
                                      style={{
                                        backgroundColor: '#FAF6F0',
                                        border: '1px solid #EADCC9',
                                        color: '#7B5233',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '0.72rem',
                                        fontWeight: 'bold',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      {c}
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const filtered = selectedComps.filter(item => item !== c);
                                          const newVal = filtered.join(', ');
                                          setScreen(prev => {
                                            const list = [...(prev.guides || [])];
                                            list[selectedGuideIdx] = { ...list[selectedGuideIdx], related_components: newVal };
                                            return { ...prev, guides: list };
                                          });
                                        }}
                                        style={{ cursor: 'pointer', color: '#A1826F', fontSize: '0.65rem' }}
                                      >
                                        ✕
                                      </span>
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: '#94A3B8' }}>Chọn các thành phần liên quan...</span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{isGuideCompDropdownOpen ? '▲' : '▼'}</span>
                            </div>

                            {isGuideCompDropdownOpen && (
                              <>
                                <div
                                  onClick={() => setIsGuideCompDropdownOpen(false)}
                                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 990 }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: '#fff',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 995,
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    marginTop: '4px',
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                  }}
                                >
                                  {screen.components && screen.components.length > 0 ? (
                                    screen.components.map(comp => {
                                      const isChecked = selectedComps.includes(comp.name);
                                      return (
                                        <div
                                          key={comp.id}
                                          onClick={() => {
                                            let updated;
                                            if (isChecked) {
                                              updated = selectedComps.filter(item => item !== comp.name);
                                            } else {
                                              updated = [...selectedComps, comp.name];
                                            }
                                            const newVal = updated.join(', ');
                                            setScreen(prev => {
                                              const list = [...(prev.guides || [])];
                                              list[selectedGuideIdx] = { ...list[selectedGuideIdx], related_components: newVal };
                                              return { ...prev, guides: list };
                                            });
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = '#FAF6F0';
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                          }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.78rem',
                                            userSelect: 'none',
                                            backgroundColor: isChecked ? '#FAF6F0' : 'transparent',
                                            color: isChecked ? '#7B5233' : '#334155',
                                            fontWeight: isChecked ? 'bold' : 'normal',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s ease'
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            readOnly
                                            style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px', flexShrink: 0 }}
                                          />
                                          <span style={{ textAlign: 'left', display: 'inline-block' }}>{comp.name}</span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div style={{ padding: '8px', color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                      Không có component nào.
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Mô tả chi tiết</label>
                            <textarea
                              rows="4"
                              value={currentStep.description || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setScreen(prev => {
                                  const list = [...(prev.guides || [])];
                                  list[selectedGuideIdx] = { ...list[selectedGuideIdx], description: val };
                                  return { ...prev, guides: list };
                                });
                              }}
                              placeholder="Mô tả chi tiết hành động hoặc hướng dẫn của bước..."
                              style={{
                                width: '100%',
                                fontSize: '0.8rem',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '10px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                fontFamily: 'inherit'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Vui lòng chọn hoặc thêm một bước để chỉnh sửa thông tin đặc tả.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Thông tin đặc tả
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', padding: '2px', borderRadius: '8px' }}>
                      {['Frontend', 'Luồng xử lý', 'Backend'].map(tab => {
                        const modeMap = {
                          'Frontend': 'blueprint',
                          'Luồng xử lý': 'workflow',
                          'Backend': 'cards'
                        };
                        const isActive = viewMode === modeMap[tab];
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setViewMode(modeMap[tab])}
                            style={{
                              padding: '4px 12px',
                              border: 'none',
                              background: isActive ? '#fff' : 'transparent',
                              color: isActive ? '#2D1A12' : '#64748B',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >
                            {tab === 'Backend' ? 'Backend ▾' : tab}
                          </button>
                        );
                      })}
                      <span style={{ padding: '0 6px', color: '#94A3B8', fontSize: '0.75rem' }}>v</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Mô tả</label>
                    <textarea
                      rows="4"
                      value={
                        viewMode === 'blueprint' ? specDescriptions.Frontend :
                          viewMode === 'workflow' ? specDescriptions['Luồng xử lý'] : specDescriptions.Backend
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpecDescriptions(prev => {
                          const next = { ...prev };
                          if (viewMode === 'blueprint') next.Frontend = val;
                          else if (viewMode === 'workflow') next['Luồng xử lý'] = val;
                          else next.Backend = val;
                          return next;
                        });
                      }}
                      placeholder={
                        viewMode === 'blueprint' ? 'Đặc tả chi tiết giao diện người dùng và cách bố trí các thành phần.' :
                          viewMode === 'workflow' ? 'Đặc tả luồng nghiệp vụ, tương tác và xử lý dữ liệu của màn hình.' :
                            'Đặc tả các API endpoint liên kết, dịch vụ và cấu trúc dữ liệu phía máy chủ.'
                      }
                      style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Card: Danh sách lỗi */}
      {screen && (
        <div className="bugs-inline-section card" style={{
          marginTop: '20px',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          backgroundColor: '#fff'
        }}>
          <div
            className="bugs-section-header"
            onClick={() => setIsBugListCollapsed(!isBugListCollapsed)}
            style={{
              padding: '12px 20px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Danh sách lỗi</span>
              <span style={{
                fontSize: '0.72rem',
                backgroundColor: '#7B5233',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 'bold'
              }}>{(screen.bugs || []).length}</span>
            </div>
            <div style={{ transform: isBugListCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '6px', color: '#7B5233', fontSize: '0.75rem' }}>v</span>
            </div>
          </div>

          {!isBugListCollapsed && (
            <div style={{ padding: '0 16px 16px 16px' }}>
              {(!screen.bugs || screen.bugs.length === 0) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  Không có báo cáo lỗi nào cho màn hình này.
                </div>
              ) : (
                <div className="table-responsive" style={{ marginTop: '14px' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Mã</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Component</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Mô tả</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Mức độ</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Trạng thái</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Ngày cập nhật</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Người cập nhật</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>Ngày ghi nhận</th>
                        <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #E5E7EB' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screen.bugs.map((bug) => {
                        const isBugExpanded = expandedBugId === bug.id;
                        const parsed = parseDescription(bug.description);
                        const severityColors = {
                          'Critical': '#EF4444',
                          'High': '#F97316',
                          'Medium': '#D97706',
                          'Low': '#10B981'
                        };
                        return (
                          <React.Fragment key={bug.id}>
                            <tr
                              onClick={() => setExpandedBugId(isBugExpanded ? null : bug.id)}
                              style={{ 
                                cursor: 'pointer', 
                                backgroundColor: isBugExpanded ? '#FAF6F0' : undefined,
                                position: 'relative',
                                zIndex: activeBugMenu === bug.id ? 50 : 1
                              }}
                              className="clickable-row"
                            >
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }} className="font-mono font-bold">BUG-{bug.id}</td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }} className="font-semibold">{parsed.tag || 'Chung'}</td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>{parsed.text}</td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>
                                <span style={{ color: severityColors[bug.severity] || '#7B5233', fontWeight: 'bold' }}>
                                  {bug.severity === 'Critical' ? 'Khẩn cấp' : (bug.severity === 'High' ? 'Cao' : (bug.severity === 'Medium' ? 'Trung bình' : 'Thấp'))}
                                </span>
                              </td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>
                                <span className={`status-badge ${getBugStatusLabel(bug.status) === 'Hoàn thành'
                                  ? 'status-resolved'
                                  : (getBugStatusLabel(bug.status) === 'Đã sửa'
                                    ? 'status-processing'
                                    : 'status-new')
                                  }`}>
                                  {getBugStatusLabel(bug.status)}
                                </span>
                              </td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>{formatDate(bug.completed_at || bug.created_at)}</td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>{bug.assignee || '-'}</td>
                              <td style={{ padding: '10px', border: '1px solid #E5E7EB', fontSize: '0.78rem' }}>{formatDate(bug.created_at)}</td>
                              <td
                                style={{ 
                                  padding: '10px', 
                                  border: '1px solid #E5E7EB', 
                                  fontSize: '0.78rem', 
                                  textAlign: 'center',
                                  position: 'relative',
                                  zIndex: activeBugMenu === bug.id ? 100 : 1
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', position: 'relative' }}>
                                  <button
                                    className="bug-action-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                                        e.nativeEvent.stopImmediatePropagation();
                                      }
                                      setActiveBugMenu(activeBugMenu === bug.id ? null : bug.id);
                                    }}
                                    title="Thao tác"
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      color: '#64748B',
                                      cursor: 'pointer',
                                      padding: '4px'
                                    }}
                                  >
                                    <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                                  </button>
                                  {activeBugMenu === bug.id && (
                                    <div className="action-menu" style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: '100%',
                                      backgroundColor: 'white',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                      borderRadius: '4px',
                                      zIndex: 9999,
                                      minWidth: '120px',
                                      border: '1px solid #E2E8F0',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      opacity: 1,
                                      animation: 'none'
                                    }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveBugMenu(null);
                                          handleOpenEditBugModal(bug);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          textAlign: 'left',
                                          background: 'none',
                                          border: 'none',
                                          borderBottom: '1px solid #E2E8F0',
                                          cursor: 'pointer',
                                          fontSize: '0.85rem',
                                          color: '#7B5233',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Chi tiết
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveBugMenu(null);
                                          handleDeleteBug(bug.id);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          textAlign: 'left',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          fontSize: '0.85rem',
                                          color: '#EF4444',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expandable details/replies */}
                            {isBugExpanded && (
                              <tr>
                                <td colSpan={9} style={{ padding: '15px 25px', backgroundColor: '#FDFCFB', borderLeft: '4px solid #7B5233' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                      {/* 1. Always display the original bug report */}
                                      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                        {/* Left: Original Screenshots */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          {bug.images && bug.images.length > 0 ? (
                                            bug.images.map((img, idx) => (
                                              <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                                <img src={getImageUrl(img.image_path)} alt="Bug spec" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                              </div>
                                            ))
                                          ) : (
                                            <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                              Không có ảnh
                                            </div>
                                          )}
                                        </div>
                                        {/* Right: Text box */}
                                        <div style={{ flex: 1, minWidth: '250px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                            <span>Phản hồi từ [{getPositionByName(bug.reporter)} - {bug.reporter || 'Hệ thống'}]</span>
                                            <span>{formatDate(bug.created_at)}</span>
                                          </div>
                                          <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.82rem', color: '#2D1A12', minHeight: '38px' }}>
                                            {parsed.text}
                                          </div>
                                        </div>
                                      </div>

                                      {/* 2. Display all updates / replies below it */}
                                      {bug.updates && bug.updates.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px dashed #FAF0E6', paddingTop: '16px' }}>
                                          {bug.updates.map((update, uIdx) => (
                                            <div key={uIdx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', borderBottom: uIdx < bug.updates.length - 1 ? '1px dashed #FAF0E6' : 'none', paddingBottom: '12px' }}>
                                              {/* Left: update screenshot proof */}
                                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {update.images && update.images.length > 0 ? (
                                                  update.images.map((img, idx) => (
                                                    <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                                      <img src={getImageUrl(img.image_path)} alt="Bug update" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                                    Không có ảnh
                                                  </div>
                                                )}
                                              </div>
                                              {/* Right: update notes */}
                                              <div style={{ flex: 1, minWidth: '250px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                                  <span>Phản hồi từ [{getPositionByName(update.updater)} - {update.updater || 'QC'}]</span>
                                                  <span>{formatDate(update.created_at)}</span>
                                                </div>
                                                <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.82rem', color: '#2D1A12', minHeight: '38px' }}>
                                                  {update.notes || <span style={{ color: '#999', fontStyle: 'italic' }}>Không có nội dung phản hồi.</span>}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* HD05: Add Component Modal popup */}
      {showAddComponentModal && (
        <div className="hd05-modal-overlay-custom" style={{
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="hd05-modal-container-custom" style={{
            background: '#ffffff',
            padding: '28px',
            borderRadius: '16px',
            width: '600px',
            maxWidth: '100%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            fontFamily: "'Outfit', sans-serif"
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
                HD05: Thêm thành phần
              </h3>
              <button
                type="button"
                onClick={() => setShowAddComponentModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Row 1: Name and Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                    Tên <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    placeholder="Nhập tên thành phần..."
                    style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                    Loại Component
                  </label>

                  {/* Custom Dropdown Trigger */}
                  <div
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    style={{
                      width: '100%',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '0.84rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      userSelect: 'none',
                      color: '#374151',
                      fontWeight: '600'
                    }}
                  >
                    <span>
                      {newComponentType === 'Button' && 'Nút'}
                      {newComponentType === 'Input Field' && 'Ô nhập dữ liệu'}
                      {newComponentType === 'Checkbox / Radio' && 'Hộp chọn'}
                      {newComponentType === 'Dropdown / Select' && 'Menu thả xuống'}
                      {newComponentType === 'Modal / Dialog' && 'Hộp hội thoại'}
                      {newComponentType === 'Navbar / Sidebar' && 'Thanh điều hướng'}
                      {newComponentType === 'Card' && 'Thẻ thông tin'}
                      {newComponentType === 'Table' && 'Bảng dữ liệu'}
                      {newComponentType === 'Carousel / Slider' && 'Trình chiếu'}
                      {newComponentType === 'Toast / Alert' && 'Thông báo nhanh'}
                      {newComponentType === 'Khác' && 'Khác'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>▼</span>
                  </div>

                  {/* Custom Dropdown Menu with descriptions inside and hover states */}
                  {isTypeDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close the dropdown on click outside */}
                      <div
                        onClick={() => setIsTypeDropdownOpen(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        zIndex: 10001,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        marginTop: '4px',
                        padding: '4px 0'
                      }}>
                        {[
                          { value: 'Button', label: 'Nút', hint: 'Nút bấm kích hoạt hành động.' },
                          { value: 'Input Field', label: 'Ô nhập dữ liệu', hint: 'Ô nhập dữ liệu văn bản.' },
                          { value: 'Checkbox / Radio', label: 'Hộp chọn', hint: 'Hộp chọn một hoặc nhiều mục.' },
                          { value: 'Dropdown / Select', label: 'Menu thả xuống', hint: 'Menu danh sách thả xuống.' },
                          { value: 'Modal / Dialog', label: 'Hộp hội thoại', hint: 'Cửa sổ thông báo bật lên.' },
                          { value: 'Navbar / Sidebar', label: 'Thanh điều hướng', hint: 'Thanh điều hướng trang web.' },
                          { value: 'Card', label: 'Thẻ thông tin', hint: 'Thẻ chứa hình ảnh và thông tin.' },
                          { value: 'Table', label: 'Bảng dữ liệu', hint: 'Bảng hiển thị dữ liệu cột.' },
                          { value: 'Carousel / Slider', label: 'Trình chiếu', hint: 'Trình trình chiếu ảnh chạy qua lại.' },
                          { value: 'Toast / Alert', label: 'Thông báo nhanh', hint: 'Thanh thông báo nhanh góc màn hình.' },
                          { value: 'Khác', label: 'Khác', hint: 'Không tồn tại trong các sự lựa chọn trên.' }
                        ].map((item) => (
                          <div
                            key={item.value}
                            onClick={() => {
                              setNewComponentType(item.value);
                              setIsTypeDropdownOpen(false);
                            }}
                            className="custom-select-item"
                            title={item.hint}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              transition: 'background 0.2s',
                              borderBottom: '1px solid #FAF6F0'
                            }}
                          >
                            <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#2D1A12' }}>{item.label}</span>
                            <span style={{ fontSize: '0.7rem', color: '#8D6E63', fontStyle: 'italic' }}>{item.hint}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: '0.74rem', color: '#8D6E63', marginTop: '6px', fontStyle: 'italic', lineHeight: '1.2' }}>
                    {newComponentType === 'Button' && '💡 Gợi ý: Nút bấm kích hoạt hành động.'}
                    {newComponentType === 'Input Field' && '💡 Gợi ý: Ô nhập dữ liệu văn bản.'}
                    {newComponentType === 'Checkbox / Radio' && '💡 Gợi ý: Hộp chọn một hoặc nhiều mục.'}
                    {newComponentType === 'Dropdown / Select' && '💡 Gợi ý: Menu danh sách thả xuống.'}
                    {newComponentType === 'Modal / Dialog' && '💡 Gợi ý: Cửa sổ thông báo bật lên.'}
                    {newComponentType === 'Navbar / Sidebar' && '💡 Gợi ý: Thanh điều hướng trang web.'}
                    {newComponentType === 'Card' && '💡 Gợi ý: Thẻ chứa hình ảnh và thông tin.'}
                    {newComponentType === 'Table' && '💡 Gợi ý: Bảng hiển thị dữ liệu cột.'}
                    {newComponentType === 'Carousel / Slider' && '💡 Gợi ý: Trình trình chiếu ảnh chạy qua lại.'}
                    {newComponentType === 'Toast / Alert' && '💡 Gợi ý: Thanh thông báo nhanh góc màn hình.'}
                    {newComponentType === 'Khác' && '💡 Gợi ý: Không tồn tại trong các sự lựa chọn trên.'}
                  </div>
                </div>
              </div>

              {/* Row 2: Frontend Spec */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Đặc tả Frontend
                </label>
                <textarea
                  rows="3"
                  value={newComponentFrontend}
                  onChange={(e) => setNewComponentFrontend(e.target.value)}
                  placeholder="Mô tả cấu trúc hiển thị, giao diện của thành phần..."
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Row 3: Workflow Spec */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Luồng xử lý/Điều kiện
                </label>
                <textarea
                  rows="3"
                  value={newComponentWorkflow}
                  onChange={(e) => setNewComponentWorkflow(e.target.value)}
                  placeholder="Mô tả các điều kiện kiểm tra, kịch bản tương tác và luồng nghiệp vụ..."
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Row 4: Backend Spec */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Đặc tả Backend
                </label>
                <textarea
                  rows="3"
                  value={newComponentBackend}
                  onChange={(e) => setNewComponentBackend(e.target.value)}
                  placeholder="Mô tả API Endpoint cần gọi, tham số request/response và logic xử lý server..."
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowAddComponentModal(false)}
                style={{ padding: '10px 24px', border: '1px solid #7B5233', borderRadius: '8px', fontSize: '0.84rem', cursor: 'pointer', background: '#fff', color: '#7B5233', fontWeight: 'bold' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmAddComponent}
                style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', fontSize: '0.84rem', cursor: 'pointer', background: '#4A2E20', color: '#fff', fontWeight: 'bold' }}
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
.custom-select-item:hover {
  background-color: #FAF2E9 !important;
}
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
      {showBugModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(45, 26, 18, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            width: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '1px solid #EADCC9',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #F1F5F9'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#2D1A12' }}>
                {bugModalMode === 'edit' ? `HD04: Chi tiết lỗi BUG-${bugModalData.id}` : `${screen?.current_code || 'AD'}: Khai báo lỗi`}
              </h3>
              <button
                type="button"
                onClick={() => setShowBugModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Row 1: Màn hình & Trạng thái */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Màn hình</label>
                  <select
                    disabled
                    value={screen?.id}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
                  >
                    <option value={screen?.id}>{screen?.current_code}: {screen?.title}</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Trạng thái</label>
                  <input
                    type="text"
                    value={bugModalMode === 'edit' ? getBugStatusLabel(bugModalData.status) : 'Mới'}
                    disabled
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
                  />
                </div>
              </div>

              {/* Row 2: Component & Mức độ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Component</label>
                  <select
                    value={bugModalData.componentName}
                    onChange={(e) => setBugModalData(prev => ({ ...prev, componentName: e.target.value }))}
                    disabled={bugModalMode === 'edit'}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
                  >
                    <option value="Chung">Chung</option>
                    {(screen?.components || []).map(comp => (
                      <option key={comp.id} value={comp.name}>{comp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Mức độ</label>
                  <select
                    value={bugModalData.severity}
                    onChange={(e) => setBugModalData(prev => ({ ...prev, severity: e.target.value }))}
                    disabled={bugModalMode === 'edit'}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
                  >
                    <option value="Critical">Khẩn cấp</option>
                    <option value="High">Cao</option>
                    <option value="Medium">Trung bình</option>
                    <option value="Low">Thấp</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Mô tả lỗi */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="required" style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Mô tả lỗi</label>
                <textarea
                  value={bugModalData.description}
                  onChange={(e) => setBugModalData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả chi tiết hành vi lỗi hoặc sự khác biệt so với đặc tả..."
                  required
                  disabled={bugModalMode === 'edit'}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: bugModalMode === 'edit' ? '#64748B' : '#334155', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              {/* Row 4: Large Image Box */}
              <div className="form-group" style={{ margin: 0 }}>
                <input
                  type="file"
                  id="bug-image-upload"
                  accept="image/*"
                  onChange={handleBugImageUpload}
                  disabled={bugModalMode === 'edit'}
                  style={{ display: 'none' }}
                />
                <div
                  onClick={() => {
                    if (bugModalMode !== 'edit') {
                      document.getElementById('bug-image-upload').click();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '180px',
                    border: '2px dashed #E2E8F0',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F8FAFC',
                    cursor: bugModalMode === 'edit' ? 'default' : 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {bugImageUploading ? (
                    <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Đang tải ảnh lên...</span>
                  ) : bugModalData.imagePath ? (
                    <>
                      <img
                        src={getImageUrl(bugModalData.imagePath)}
                        alt="Bug upload preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      {bugModalMode !== 'edit' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBugModalData(prev => ({ ...prev, imagePath: '' }));
                          }}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px'
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '2.5rem', color: '#CBD5E1', marginBottom: '8px' }}>🖼️</span>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 'bold' }}>Thêm hình ảnh lỗi</span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>Hỗ trợ định dạng JPG, PNG</span>
                    </>
                  )}
                </div>
              </div>

              {/* Row 5: Người ghi nhận & Thời gian ghi nhận */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Người ghi nhận</label>
                  <input
                    type="text"
                    value={bugModalData.reporter}
                    disabled
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Thời gian ghi nhận</label>
                  <input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    disabled
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', boxSizing: 'border-box', height: '36px' }}
                  />
                </div>
              </div>

              {/* Row 6: Người xử lý & Hạn hoàn thành */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Người xử lý</label>
                  <select
                    value={bugModalData.assignee}
                    onChange={(e) => setBugModalData(prev => ({ ...prev, assignee: e.target.value }))}
                    disabled={bugModalMode === 'edit'}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
                  >
                    {itAccounts.map((acc, idx) => (
                      <option key={idx} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Ngày yêu cầu hoàn thành</label>
                  <input
                    type="date"
                    value={bugModalData.targetDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBugModalData(prev => ({ ...prev, targetDate: e.target.value }))}
                    disabled={bugModalMode === 'edit'}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: bugModalMode === 'edit' ? '#64748B' : '#334155', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
                  />
                </div>
              </div>

              {/* Row 7 & 8: Phản hồi & Cập nhật trạng thái / Ảnh */}
              {bugModalMode === 'edit' ? (
                <>
                  {/* Phản hồi * */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="required" style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Phản hồi</label>
                    <textarea
                      value={replyNotes}
                      onChange={(e) => setReplyNotes(e.target.value)}
                      placeholder="Nhập nội dung phản hồi kết quả sửa lỗi..."
                      required
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>

                  {/* Cập nhật trạng thái */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Cập nhật trạng thái</label>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {(getBugStatusLabel(bugModalData.status) === 'Mới' || getBugStatusLabel(bugModalData.status) === 'Sửa lại') ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={replyStatusVal === 'Đã sửa'}
                            onChange={(e) => setReplyStatusVal(e.target.checked ? 'Đã sửa' : '')}
                            style={{ cursor: 'pointer' }}
                          />
                          Xác nhận đã sửa (Đã sửa)
                        </label>
                      ) : getBugStatusLabel(bugModalData.status) === 'Đã sửa' ? (
                        <>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#059669', fontWeight: '600', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="status-transition-modal"
                              checked={replyStatusVal === 'Hoàn thành'}
                              onChange={() => setReplyStatusVal('Hoàn thành')}
                              style={{ cursor: 'pointer' }}
                            />
                            Xác nhận (Hoàn thành)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#EF4444', fontWeight: '600', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="status-transition-modal"
                              checked={replyStatusVal === 'Từ chối'}
                              onChange={() => setReplyStatusVal('Từ chối')}
                              style={{ cursor: 'pointer' }}
                            />
                            Từ chối (Sửa lại)
                          </label>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic' }}>Không có tùy chọn chuyển đổi trạng thái nào cho trạng thái này.</span>
                      )}
                    </div>
                  </div>

                  {/* Phản hồi images upload */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Hình ảnh phản hồi đính kèm (Cho phép up ảnh đã chỉnh sửa)</label>
                    <input
                      type="file"
                      id="modal-reply-image-upload"
                      accept="image/*"
                      multiple
                      onChange={handleReplyImageUpload}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <div
                        onClick={() => document.getElementById('modal-reply-image-upload').click()}
                        style={{
                          width: '120px',
                          height: '80px',
                          border: '2px dashed #E2E8F0',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F8FAFC',
                          cursor: 'pointer',
                          color: '#64748B'
                        }}
                      >
                        {replyUploading ? (
                          <span style={{ fontSize: '0.7rem' }}>Đang tải...</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '1.25rem' }}>➕</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 'bold', marginTop: '2px' }}>Tải ảnh lên</span>
                          </>
                        )}
                      </div>

                      {replyImages.map((img, idx) => (
                        <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', position: 'relative', backgroundColor: '#F8FAFC' }}>
                          <img src={getImageUrl(img)} alt="Reply preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setReplyImages(prev => prev.filter((_, i) => i !== idx))}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px'
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Row 7: Disabled Phản hồi */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Phản hồi *</label>
                    <input
                      type="text"
                      disabled
                      placeholder="Người xử lý phản hồi sau khi hoàn thành..."
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', boxSizing: 'border-box', height: '36px' }}
                    />
                  </div>

                  {/* Row 8: Disabled Phản hồi images */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ height: '80px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.25rem', color: '#CBD5E1' }}>🖼️</span>
                    </div>
                    <div style={{ height: '80px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.25rem', color: '#CBD5E1' }}>🖼️</span>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 24px',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#F8FAFC',
              borderRadius: '0 0 16px 16px'
            }}>
              <button
                type="button"
                onClick={() => setShowBugModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#fff',
                  color: '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  height: '36px'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={bugModalMode === 'edit' ? handleUpdateBug : handleCreateBug}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4A2E20',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  height: '36px'
                }}
              >
                {bugModalMode === 'edit' ? 'Lưu thay đổi' : 'Tạo mới'}
              </button>
            </div>

          </div>
        </div>
      )}
      <BeautifulConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );

};



export default ScreenDetail;

