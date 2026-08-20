import React from 'react';
import {
  Play, Type, Table2, CheckSquare, List, Layout, Menu, CreditCard, Sliders, Bell,
  Component, Bug, MoreVertical, ChevronDown, Upload, FileText, X, Plus, Edit
} from 'lucide-react';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { screenService } from '@modules/System/Models/screen.service';
import { bugService } from '@modules/System/Models/bug.service';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import BugDetailModal from '@webShared/Views/components/modals/BugDetailModal';
import ScreenSimulator from '@modules/System/Views/components/ScreenSimulation';
import SCREEN_DOCS from '../components/screenDocs';
import { useScreenMetadataCached, clearScreenMetadataCache } from '@webShared/hooks/useScreenMetadata';
import { useScreen } from '@shared/context/ScreenContext';

export const renderComponentIcon = (type) => {
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

export const CATEGORIES = [
  { key: 'UI Component', label: 'UI Component', icon: '📂' },
  { key: 'Logic / Service', label: 'Logic / Service', icon: '⚙️' },
  { key: 'API Endpoint', label: 'API Endpoint', icon: '🔗' },
  { key: 'Native API', label: 'Native API', icon: '📱' }
];

export const getComponentCategory = (comp) => {
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

export const getLoggedInUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
    return user.full_name || user.username || 'Phúc';
  } catch {
    return 'Phúc';
  }
};

export const getBugStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'new' || s === 'mới') return 'Mới';
  if (s === 'resolved' || s === 'đã sửa') return 'Đã sửa';
  if (s === 'verified' || s === 'hoàn thành') return 'Hoàn thành';
  if (s === 'reopened' || s === 'sửa lại' || s === 'in progress' || s === 'in_progress') return 'Sửa lại';
  return status;
};




export const normalizeTitle = (title) => {
  if (!title) return '';
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Khử dấu
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')   // Xóa khoảng trắng & ký tự đặc biệt
    .toLowerCase();
};



// Cấu trúc hiển thị thông tin kỹ thuật (hỗ trợ cả text thường và JSON AST)

export const renderTechnicalDetails = (technicalDetails) => {

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

export const getWorkflowForScreen = (screen, components = []) => {

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

export const getConnections = (screen, compName) => {

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

export const getComponentCodeDetails = (screen, compName) => {

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

export const getSandboxResponse = (screen, compName) => {

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

export const getDatabaseOperations = (comp, dbTables) => {

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

export const getApiDocumentation = (apiItem) => {

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

export const getComponentSubElements = (comp) => {

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



export const getComponentHint = (comp) => {
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

export const parseDescription = (desc) => {
  if (!desc) return { tag: '', text: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return { tag: match[1], text: match[2] };
  }
  return { tag: '', text: desc };
};

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = getBaseURL();
  return `${apiBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export const getPositionByName = (name) => {
  if (!name) return 'QC';
  const n = name.toLowerCase();
  if (n.includes('admin') || n.includes('it') || n.includes('hệ thống') || n.includes('administrator')) return 'Admin';
  if (n.includes('phuc') || n.includes('dev') || n.includes('coder') || n.includes('developer') || n.includes('phucv1')) return 'Lập trình viên';
  if (n.includes('qc') || n.includes('tester') || n.includes('kiem thu') || n.includes('nguyễn văn') || n.includes('phuong')) return 'QC';
  return 'QC';
};

export const formatDate = (dateStr) => {
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

export const getSubsystem = (screen) => {
  if (!screen) return 'Quản lý hệ thống';
  const code = (screen.current_code || '').toUpperCase();
  if (code.startsWith('TC')) return 'Trang chủ';
  if (code.startsWith('ISO') || code.startsWith('AD17') || code.startsWith('AD18')) return 'Hồ sơ ISO';
  if (code.startsWith('KPI') || code.startsWith('AD7')) return 'Quản lý KPI';
  if (code.startsWith('HT') || code.startsWith('HD') || code.startsWith('AD')) return 'Quản lý hệ thống';
  if (code.startsWith('HS') || code.startsWith('NS')) return 'Quản lý nhân sự';
  if (code.startsWith('SX') || code.startsWith('MA')) return 'Quản lý sản xuất';
  if (code.startsWith('CL')) return 'Quản lý chất lượng';
  if (code.startsWith('KD')) return 'Quản lý kinh doanh';
  if (code.startsWith('KT')) return 'Quản lý kỹ thuật';
  if (code.startsWith('BT')) return 'Bảo trì - cơ sở hạ tầng';

  // Fallback by route path
  const path = screen.route_path || '';
  if (path.includes('/kpi')) return 'Quản lý KPI';
  if (path.includes('/iso-documents') || path.includes('/iso-processes')) return 'Hồ sơ ISO';
  if (path.includes('/manufacture') || path.includes('/plan') || path.includes('/delivery-tracking') || path.includes('/orders')) {
    return 'Quản lý sản xuất';
  }
  if (path.includes('/quality-records') || path.includes('/defects') || path.includes('/claims') || path.includes('/capa')) {
    return 'Quản lý chất lượng';
  }
  if (path.includes('/prices') || path.includes('/shipments') || path.includes('/purchase-requisitions') || path.includes('/purchase-order-items') || path.includes('/customers') || path.includes('/order-shipping-monitoring')) {
    return 'Quản lý kinh doanh';
  }
  if (path.includes('/products')) {
    return 'Quản lý kỹ thuật';
  }
  if (path.includes('/machines')) {
    return 'Bảo trì - cơ sở hạ tầng';
  }
  return 'Quản lý hệ thống';
};

export const SUBSYSTEM_PREFIXES = {
  'Trang chủ': 'TC',
  'Quản lý hệ thống': 'HT',
  'Quản lý nhân sự': 'HS',
  'Hồ sơ ISO': 'ISO',
  'Quản lý sản xuất': 'SX',
  'Quản lý chất lượng': 'CL',
  'Quản lý kinh doanh': 'KD',
  'Quản lý kỹ thuật': 'KT',
  'Bảo trì - cơ sở hạ tầng': 'BT',
  'Quản lý KPI': 'KPI'
};

export const MAP_SIDEBAR_GROUP_TO_SUBSYSTEM = {
  'Trang chủ': 'Trang chủ',
  'Quản lý hệ thống': 'Quản lý hệ thống',
  'Quản lý nhân sự': 'Quản lý nhân sự',
  'Hồ sơ ISO': 'Hồ sơ ISO',
  'Quản lý sản xuất': 'Quản lý sản xuất',
  'Quản lý chất lượng': 'Quản lý chất lượng',
  'Quản lý KPI': 'Quản lý KPI',
  'Quản lý kinh doanh': 'Quản lý kinh doanh',
  'Quản lý kỹ thuật': 'Quản lý kỹ thuật',
  'Bảo trì - cơ sở hạ tầng': 'Bảo trì - cơ sở hạ tầng',
  // Mobile sidebar group mappings
  'Thông tin sản xuất': 'Quản lý sản xuất',
  'Phiếu kiểm tra': 'Quản lý chất lượng',
  'Báo cáo công việc': 'Quản lý sản xuất',
  'Báo cáo CAPA': 'Quản lý chất lượng',
  'Tạo CTQ, SOS': 'Quản lý chất lượng',
  'Báo cáo vi phạm': 'Quản lý nhân sự',
  'Cảnh báo lỗi': 'Quản lý chất lượng',
  'Góp ý': 'Quản lý hệ thống'
};

export const ROUTE_SUGGESTIONS = {
  'Trang chủ': [
    { title: 'Trang chủ', path: '/admin/dashboard' }
  ],
  'Quản lý hệ thống': [
    { title: 'Giám sát hệ thống', path: '/admin/monitor' },
    { title: 'Danh sách màn hình', path: '/admin/screens' },
    { title: 'Theo dõi góp ý', path: '/admin/feedback' },
    { title: 'Đóng gói dữ liệu', path: '/admin/data' },
    { title: 'Quản lý tài khoản', path: '/admin/users' }
  ],
  'Quản lý nhân sự': [
    { title: 'Sơ đồ tổ chức', path: '/admin/hr/org-chart' },
    { title: 'Danh sách nhân viên', path: '/admin/hr/employees' },
    { title: 'Quản lý phòng ban', path: '/admin/users/departments' }
  ],
  'Hồ sơ ISO': [
    { title: 'Quản lý mẫu tài liệu', path: '/admin/iso-documents' },
    { title: 'Quy trình nghiệp vụ', path: '/admin/iso-processes' }
  ],
  'Quản lý sản xuất': [
    { title: 'Kế hoạch sản xuất', path: '/admin/plan' },
    { title: 'Kế hoạch bàn giao', path: '/admin/delivery-tracking' },
    { title: 'Phiếu ngoại lệ', path: '/admin/exception-deliveries' },
    { title: 'Trang chủ sản xuất', path: '/admin/manufacture-dashboard' },
    { title: 'Quản lý mã QR', path: '/admin/backup-qrs' }
  ],
  'Quản lý chất lượng': [
    { title: 'Hồ sơ chất lượng', path: '/admin/quality-records' },
    { title: 'Danh sách lỗi', path: '/admin/defects' },
    { title: 'Claim khách hàng', path: '/admin/claims' },
    { title: 'Quản lý CAPA', path: '/admin/capa' },
    { title: 'Báo cáo kiểm tra', path: '/admin/reports' },
    { title: 'Danh sách bàn giao', path: '/admin/handovers' },
    { title: 'Điểm nóng cần chú ý', path: '/admin/hotspots' },
    { title: 'Quản lý thiết bị', path: '/admin/equipment' },
    { title: 'Nhật ký sự cố', path: '/admin/logs' }
  ],
  'Quản lý kinh doanh': [
    { title: 'Quản lý khách hàng', path: '/admin/customers' },
    { title: 'Thời gian xuất cont', path: '/admin/shipments' },
    { title: 'Đơn giá sản phẩm', path: '/admin/prices' },
    { title: 'Danh sách đơn hàng', path: '/admin/purchase-requisitions' },
    { title: 'Chi tiết mặt hàng đơn mua', path: '/admin/purchase-order-items' },
    { title: 'Giám sát vận chuyển', path: '/admin/order-shipping-monitoring' }
  ],
  'Quản lý kỹ thuật': [
    { title: 'Bom sản phẩm', path: '/admin/products' },
    { title: 'BOM vật tư', path: '/admin/material-boms' }
  ],

  'Bảo trì - cơ sở hạ tầng': [
    { title: 'Danh sách thiết bị', path: '/admin/machines' },
    { title: 'Lịch sử bảo trì', path: '/admin/machines/history' },
    { title: 'Hướng dẫn sử dụng', path: '/admin/machines/training' },
    { title: 'Danh mục thiết bị', path: '/admin/equipment/categories' },
    { title: 'Lịch sử thiết bị', path: '/admin/equipment/history' },
    { title: 'Đào tạo thiết bị', path: '/admin/equipment/training' }
  ],
  'Quản lý KPI': [
    { title: 'Báo cáo KPI', path: '/admin/kpi' },
    { title: 'Checklist KPI', path: '/admin/kpi/checklist' },
    { title: 'Danh sách KPI', path: '/admin/kpi/list' },
    { title: 'Quy tắc KPI', path: '/admin/kpi/rules' },
    { title: 'Phản hồi KPI', path: '/admin/kpi/feedback' }
  ]
};
export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Khử dấu
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Đổi khoảng trắng thành -
    .replace(/[^a-z0-9\-]/g, '') // Loại bỏ ký tự đặc biệt khác ngoại trừ -
    .replace(/\-\-+/g, '-'); // Tránh nhiều dấu - liên tiếp
};

export const parseRoutePath = (routePath, sidebarMenus = []) => {
  if (!routePath) {
    return {
      frontendPath: '',
      backendPath: ''
    };
  }

  let clean = routePath.trim().replace(/\/+/g, '/');

  // Tìm mục menu sidebar khớp tiền tố dài nhất
  let longestMatch = '';
  const checkItem = (item) => {
    if (item.route_path && clean.startsWith(item.route_path)) {
      if (item.route_path.length > longestMatch.length) {
        longestMatch = item.route_path;
      }
    }
    if (item.children) {
      item.children.forEach(checkItem);
    }
  };

  if (Array.isArray(sidebarMenus)) {
    sidebarMenus.forEach(checkItem);
  }

  if (longestMatch) {
    let suffix = clean.substring(longestMatch.length);
    if (suffix && !suffix.startsWith('/')) {
      suffix = '/' + suffix;
    }
    return {
      frontendPath: longestMatch,
      backendPath: suffix || ''
    };
  }

  // Fallback: nếu có tham số động (chứa dấu :), cắt trước tham số đầu tiên
  const colonIdx = clean.indexOf(':');
  if (colonIdx !== -1) {
    const slashBeforeColon = clean.lastIndexOf('/', colonIdx);
    if (slashBeforeColon !== -1 && slashBeforeColon > 0) {
      return {
        frontendPath: clean.substring(0, slashBeforeColon),
        backendPath: clean.substring(slashBeforeColon)
      };
    }
  }

  return {
    frontendPath: clean,
    backendPath: ''
  };
};

export const combineRoutePath = (dir, url) => {
  const cleanDir = (dir || '').trim();
  const cleanUrl = (url || '').trim();
  let combined = '';
  if (cleanDir && cleanUrl) {
    combined = `${cleanDir}/${cleanUrl}`;
  } else {
    combined = cleanDir || cleanUrl || '';
  }
  return combined.replace(/\/+/g, '/');
};

export const normalizeRoutePath = (path) => {
  if (!path) return '';
  return path.trim().replace(/\/+/g, '/');
};

export const buildRouteSuggestionsFromSidebar = (sidebarItems, platform = 'Web') => {
  const suggestions = {};
  
  const subsystemsList = [
    'Trang chủ', 'Quản lý hệ thống', 'Quản lý nhân sự', 'Hồ sơ ISO',
    'Quản lý sản xuất', 'Quản lý chất lượng', 'Quản lý kinh doanh',
    'Quản lý kỹ thuật', 'Bảo trì - cơ sở hạ tầng', 'Quản lý KPI'
  ];
  subsystemsList.forEach(sub => {
    suggestions[sub] = [];
  });
  
  const processItem = (item, parentGroup = '') => {
    if (item.platform === platform && item.route_path) {
      const subsystem = MAP_SIDEBAR_GROUP_TO_SUBSYSTEM[parentGroup] || 'Quản lý hệ thống';
      if (!suggestions[subsystem]) {
        suggestions[subsystem] = [];
      }
      if (!suggestions[subsystem].some(s => s.path === item.route_path)) {
        suggestions[subsystem].push({
          title: item.title,
          path: item.route_path
        });
      }
    }
    
    if (item.children && item.children.length > 0) {
      item.children.forEach(child => {
        processItem(child, parentGroup || item.title);
      });
    }
  };
  
  if (Array.isArray(sidebarItems)) {
    sidebarItems.forEach(item => {
      processItem(item, item.title);
    });
  }
  
  // Merge with static defaults as fallback
  for (const sub in ROUTE_SUGGESTIONS) {
    if (!suggestions[sub]) suggestions[sub] = [];
    ROUTE_SUGGESTIONS[sub].forEach(fallback => {
      if (!suggestions[sub].some(s => s.path === fallback.path)) {
        suggestions[sub].push(fallback);
      }
    });
  }
  
  return suggestions;
};

export const getDisplayRoutePath = (path, subsystem, customSuggestions = null) => {
  if (!path) return '';

  const activeSuggestions = customSuggestions || ROUTE_SUGGESTIONS;
  const suggestions = activeSuggestions[subsystem] || [];
  const suggestion = suggestions.find(s => s.path === path);
  if (suggestion) {
    return suggestion.title;
  }

  for (const sub in activeSuggestions) {
    const found = activeSuggestions[sub].find(s => s.path === path);
    if (found) return found.title;
  }

  if (path.startsWith('/admin/')) {
    return path.slice(7);
  }
  if (path.startsWith('/admin')) {
    return path.slice(6);
  }
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
};

export const generateNextScreenCode = (subsystemName, screensList) => {
  const prefix = SUBSYSTEM_PREFIXES[subsystemName] || 'HT';
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

export const COMPONENT_COLORS = {
  default: { bg: '#FFFFFF', border: '#E2E8F0', text: '#334155' },
  red: { bg: '#FFF5F5', border: '#FEB2B2', text: '#9B2C2C' },
  orange: { bg: '#FFFAF0', border: '#FBD38D', text: '#9C4221' },
  yellow: { bg: '#FFFFF0', border: '#FAF089', text: '#744210' },
  green: { bg: '#F0FFF4', border: '#9AE6B4', text: '#22543D' },
  blue: { bg: '#EBF8FF', border: '#90CDF4', text: '#2B6CB0' },
  purple: { bg: '#FAF5FF', border: '#D6BCFA', text: '#553C9A' }
};

