import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { hrService } from '@modules/auth/Models/hr.service';
import DepartmentModal from '@modules/auth/Views/Department/DepartmentModal';
import { 
  FileText, Plus, Edit2, Trash2, Search, ArrowUp, ArrowDown, Layout, Smartphone, 
  X, HelpCircle, Save, ChevronRight, CheckSquare, Square, RefreshCw, Layers, Briefcase, Users, Building2, Sliders,
  Tag, Factory, Contact, ShieldCheck, Palette, ClipboardList, ExternalLink, AlertOctagon, ClipboardCheck
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import PaintColorManagementView from '@modules/Product/Views/PaintColors/PaintColorManagementView';
import ProductDetailsManagementView from '@modules/Product/Views/Details/ProductDetailsManagementView';
import QCSamplingConfigView from '@modules/Inspection/Views/Config/QCSamplingConfigView';
import '@styles/components.css';

import * as Icons from 'lucide-react';

const DynamicIcon = ({ name, size = 16, ...props }) => {
  if (!name) return <HelpCircle size={size} {...props} />;
  const IconComponent = Icons[name];
  if (!IconComponent) return <HelpCircle size={size} {...props} />;
  return <IconComponent size={size} {...props} />;
};

export default function SystemConfigView() {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { toast } = useToast();
  const navigate = useNavigate();

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/system-config');

  // LEFT MENU SELECTION STATE
  // 'factory' | 'department' | 'position' | 'role' | 'sidebar' | 'category' | 'stage' | 'customer' | 'permission'
  const [activeTab, setActiveTab] = useState('factory');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  
  // MODAL STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  // --- SUB-TABLE STATES ---
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('subtab1');
  const [subTableData, setSubTableData] = useState([]);
  const [subTableLoading, setSubTableLoading] = useState(false);

  // LINK MODAL STATES (For Sub-table CRUD)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // --- FACTORY FORM STATES ---
  const [factoryCode, setFactoryCode] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [factoryType, setFactoryType] = useState('Nhà máy');
  const [factoryParentId, setFactoryParentId] = useState('');
  const [factoryDesc, setFactoryDesc] = useState('');

  // --- GENERAL DEPARTMENT/POSITION FORM STATES ---
  const [generalCode, setGeneralCode] = useState('');
  const [generalName, setGeneralName] = useState('');
  const [generalDesc, setGeneralDesc] = useState('');
  const [deptRoleId, setDeptRoleId] = useState('');
  const [deptResponsibilityScope, setDeptResponsibilityScope] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);


  // --- CATEGORY (Dòng hàng) FORM STATES ---
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catMainCategory, setCatMainCategory] = useState('');

  // --- DEFECT CATEGORY (Phân nhóm lỗi QC) FORM STATES ---
  const [defectCatCode, setDefectCatCode] = useState('');
  const [defectCatName, setDefectCatName] = useState('');
  const [defectCatPrefix, setDefectCatPrefix] = useState('');
  const [defectCatDesc, setDefectCatDesc] = useState('');
  const [defectCatOrder, setDefectCatOrder] = useState(0);
  const [defectCatIsActive, setDefectCatIsActive] = useState(true);

  // --- STAGE (Công đoạn) FORM STATES ---
  const [stageCode, setStageCode] = useState('');
  const [stageName, setStageName] = useState('');
  const [stageSequence, setStageSequence] = useState(0);
  const [stageIsActive, setStageIsActive] = useState(true);
  const [stageDesc, setStageDesc] = useState('');

  // --- CUSTOMER FORM STATES ---
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custContact, setCustContact] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custTax, setCustTax] = useState('');
  const [custCountry, setCustCountry] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // --- PERMISSION (Chức vụ phân quyền / Vị trí) FORM STATES ---
  const [permName, setPermName] = useState('');
  const [permDesc, setPermDesc] = useState('');
  const [permRoleId, setPermRoleId] = useState('');
  const [permDeptId, setPermDeptId] = useState('');
  const [permIsActive, setPermIsActive] = useState(true);
  const [deptOptions, setDeptOptions] = useState([]);

  // --- INSPECTION FORM TYPE (Loại phiếu kiểm tra) STATES ---
  const [formTypeCode, setFormTypeCode] = useState('');
  const [formTypeName, setFormTypeName] = useState('');
  const [formTypeShortName, setFormTypeShortName] = useState('');
  const [formTypeDesc, setFormTypeDesc] = useState('');
  const [formTypeRoute, setFormTypeRoute] = useState('');
  const [formTypeColor, setFormTypeColor] = useState('#0284C7');
  const [formTypeBgColor, setFormTypeBgColor] = useState('#F0F9FF');
  const [formTypeOrder, setFormTypeOrder] = useState(0);
  const [formTypeIsActive, setFormTypeIsActive] = useState(true);

  // --- INSPECTION PARAMETER (Thông số kiểm tra) STATES ---
  const [paramCode, setParamCode] = useState('');
  const [paramName, setParamName] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [paramMin, setParamMin] = useState('');
  const [paramMax, setParamMax] = useState('');
  const [paramOrder, setParamOrder] = useState(0);
  const [paramIsActive, setParamIsActive] = useState(true);

  // --- ISO DOCUMENT TYPE (Loại hồ sơ ISO) STATES ---
  const [isoDocTypeName, setIsoDocTypeName] = useState('');
  const [isoDocTypeCode, setIsoDocTypeCode] = useState('');
  const [isoDocTypeDesc, setIsoDocTypeDesc] = useState('');

  // --- SIDEBAR TREE STATES ---
  const [sidebarPlatform, setSidebarPlatform] = useState('Web'); // 'Web' or 'Mobile'
  const [collapsedGroupIds, setCollapsedGroupIds] = useState({});
  const [formTitle, setFormTitle] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formRoutePath, setFormRoutePath] = useState('');
  const [formIcon, setFormIcon] = useState('LayoutGrid');
  const [formPermissionKey, setFormPermissionKey] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const iconOptions = [
    'LayoutGrid', 'Settings', 'Users', 'ShieldCheck', 'Wrench', 'BarChart2',
    'Calendar', 'FileText', 'ShoppingCart', 'Sliders', 'Home', 'Box', 'Cpu',
    'Clock', 'Bell', 'QrCode', 'MessageSquare', 'Gamepad2', 'Smile', 'Grid',
    'Coins', 'Cookie', 'Network', 'User', 'Briefcase', 'Folder', 'File',
    'Layers', 'Truck', 'AlertTriangle', 'Slash', 'MessageCircle', 'CheckCircle',
    'Clipboard', 'List', 'MapPin', 'BookOpen', 'DollarSign', 'Tag', 'FilePlus'
  ];

  // Set page headers
  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
          setActionMenuId(null);
        }
      } else {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Data based on active Left Menu Tab
  const loadData = async () => {
    if (activeTab === 'paint_color' || activeTab === 'product_detail' || activeTab === 'qc_sampling') {
      setDataList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'factory') {
        const res = await hrService.getFactoryStructures();
        setDataList(res || []);
      } else if (activeTab === 'department') {
        const [deptRes, roleRes] = await Promise.all([
          api.get('/departments/'),
          api.get('/roles/?include_inactive=true')
        ]);
        setDataList(Array.isArray(deptRes) ? deptRes : (deptRes?.data || []));
        setRoleOptions(Array.isArray(roleRes) ? roleRes : (roleRes?.data || []));
      } else if (activeTab === 'position') {
        const res = await hrService.getPositions();
        setDataList(res || []);
      } else if (activeTab === 'role') {
        const res = await api.get('/roles/?include_inactive=true');
        setDataList(res || []);
      } else if (activeTab === 'sidebar') {
        const res = await api.get('/system/sidebar/all');
        setDataList(res || []);
      } else if (activeTab === 'category') {
        const res = await api.get('/master-categories/');
        setDataList(res || []);
      } else if (activeTab === 'defect_category') {
        const catRes = await api.get('/inspections/defect-categories?include_inactive=true');
        setDataList(Array.isArray(catRes) ? catRes : (catRes?.data || []));
      } else if (activeTab === 'stage') {
        const res = await api.get('/stages/');
        setDataList(res || []);
      } else if (activeTab === 'customer') {
        const res = await api.get('/customers/');
        setDataList(Array.isArray(res) ? res : (res?.items || []));
      } else if (activeTab === 'permission') {
        const [permRes, roleRes, deptRes] = await Promise.all([
          api.get('/permissions/?include_inactive=true'),
          api.get('/roles/?include_inactive=true'),
          api.get('/departments/')
        ]);
        setDataList(permRes || []);
        setRoleOptions(Array.isArray(roleRes) ? roleRes : (roleRes?.data || []));
        setDeptOptions(Array.isArray(deptRes) ? deptRes : (deptRes?.data || []));
      } else if (activeTab === 'inspection_form_type') {
        const res = await api.get('/inspection-form-types?include_inactive=true');
        setDataList(Array.isArray(res) ? res : (res?.data || []));
      } else if (activeTab === 'inspection_parameter') {
        const res = await api.get('/inspection-parameters?include_inactive=true');
        setDataList(Array.isArray(res) ? res : (res?.data || []));
      } else if (activeTab === 'iso_document_type') {
        const res = await api.get('/iso-documents/types');
        setDataList(Array.isArray(res) ? res : (res?.data || []));
      }
    } catch (e) {
      console.error(e);
      toast('error', 'Lỗi khi tải danh sách cấu hình!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    setSelectedRow(null);
    setActiveSubTab('subtab1');
    setSubTableData([]);
    loadData();
  }, [activeTab]);

  // SUB-TABLE DATA FETCHER
  const fetchSubTableData = async (row, mainTab, subTabKey) => {
    if (!row || !row.id) {
      setSubTableData([]);
      return;
    }
    setSubTableLoading(true);
    try {
      if (mainTab === 'factory') {
        if (subTabKey === 'subtab1') {
          const res = await hrService.getFactoryDepartments(row.id);
          setSubTableData(res || []);
        } else if (subTabKey === 'subtab2') {
          const res = await hrService.getFactoryChildren(row.id);
          setSubTableData(res || []);
        }
      } else if (mainTab === 'department') {
        if (subTabKey === 'subtab1') {
          const res = await hrService.getPositions('', row.id);
          setSubTableData(res || []);
        } else if (subTabKey === 'subtab2') {
          const res = await hrService.getDepartmentEmployees(row.id);
          setSubTableData(res || []);
        }
      } else if (mainTab === 'position') {
        if (subTabKey === 'subtab1') {
          const res = await hrService.getPositionEmployees(row.id);
          setSubTableData(res || []);
        } else if (subTabKey === 'subtab2') {
          const res = await hrService.getPositionDepartments(row.id);
          setSubTableData(res || []);
        }
      } else if (mainTab === 'role') {
        if (subTabKey === 'subtab1') {
          const res = await hrService.getSections('', row.id);
          setSubTableData(res || []);
        } else if (subTabKey === 'subtab2') {
          const res = await hrService.getRoleEmployees(row.id);
          setSubTableData(res || []);
        }
      } else if (mainTab === 'sidebar') {
        if (subTabKey === 'subtab1') {
          setSubTableData(row.children || []);
        } else if (subTabKey === 'subtab2') {
          setSubTableData([
            { field: 'Mã ID', value: row.id },
            { field: 'Tiêu đề Menu', value: row.title },
            { field: 'Đường dẫn (Route)', value: row.route_path || '---' },
            { field: 'Nền tảng', value: row.platform },
            { field: 'Biểu tượng (Icon)', value: row.icon || 'LayoutGrid' },
            { field: 'Khóa phân quyền', value: row.permission_key || '---' },
            { field: 'Trạng thái', value: row.is_active ? 'Đang hoạt động' : 'Tạm ẩn' }
          ]);
        }
      } else if (mainTab === 'category') {
        if (subTabKey === 'subtab1') {
          if (row.products && Array.isArray(row.products)) {
            setSubTableData(row.products);
          } else {
            try {
              const res = await api.get(`/master-products/?category_id=${row.id}`);
              setSubTableData(Array.isArray(res) ? res : (res?.items || []));
            } catch (e) {
              setSubTableData([]);
            }
          }
        } else if (subTabKey === 'subtab2') {
          setSubTableData([
            { field: 'Mã định danh ID', value: row.id },
            { field: 'Tên Dòng hàng', value: row.name },
            { field: 'Dòng hàng chính', value: row.main_category || '---' },
            { field: 'Mô tả / Diễn giải', value: row.description || '---' },
            { field: 'Số sản phẩm liên kết', value: row.product_count ?? (row.products?.length || 0) },
            { field: 'Trạng thái', value: row.status === 1 ? 'Hiệu lực' : 'Hết hiệu lực' },
            { field: 'Ngày khởi tạo', value: formatDate(row.created_at) }
          ]);
        }
      } else if (mainTab === 'defect_category') {
        if (subTabKey === 'subtab1') {
          try {
            const allDefects = await api.get('/inspections/defect-types?include_inactive=true');
            const linked = (allDefects || []).filter(d => (d.category || '').toLowerCase() === (row.code || '').toLowerCase());
            setSubTableData(linked);
          } catch (e) {
            setSubTableData([]);
          }
        } else if (subTabKey === 'subtab2') {
          setSubTableData([
            { field: 'Mã phân nhóm (Key)', value: row.code },
            { field: 'Tên phân nhóm QC', value: row.name },
            { field: 'Tiền tố sinh mã G7', value: row.prefix },
            { field: 'Số loại lỗi đang sử dụng', value: `${row.defect_count || 0} loại lỗi` },
            { field: 'Mô tả / Tiêu chuẩn', value: row.description || '---' },
            { field: 'Thứ tự ưu tiên', value: row.order_index ?? 0 },
            { field: 'Trạng thái', value: row.is_active ? 'Đang sử dụng' : 'Dừng hoạt động' },
            { field: 'Ngày tạo', value: formatDate(row.created_at) }
          ]);
        }
      } else if (mainTab === 'stage') {
        if (subTabKey === 'subtab1') {
          if (row.permissions && Array.isArray(row.permissions)) {
            setSubTableData(row.permissions);
          } else {
            try {
              const allPerms = await api.get('/permissions/?include_inactive=true');
              const linked = (allPerms || []).filter(p => (p.stages || []).some(s => s.id === row.id));
              setSubTableData(linked);
            } catch (e) {
              setSubTableData([]);
            }
          }
        } else if (subTabKey === 'subtab2') {
          setSubTableData([
            { field: 'Mã ID Công đoạn', value: row.id },
            { field: 'Tên Công đoạn SX', value: row.name },
            { field: 'Diễn giải quy trình', value: row.description || '---' },
            { field: 'Số chức vụ phụ trách', value: row.permissions?.length || 0 }
          ]);
        }
      } else if (mainTab === 'customer') {
        setSubTableData([
          { field: 'Mã định danh ID', value: row.id },
          { field: 'Mã Khách hàng', value: row.code },
          { field: 'Tên Doanh nghiệp / Khách hàng', value: row.name },
          { field: 'Người liên hệ', value: row.contact_person || '---' },
          { field: 'Số điện thoại', value: row.phone || '---' },
          { field: 'Email liên hệ', value: row.email || '---' },
          { field: 'Mã số thuế (MST)', value: row.tax_code || '---' },
          { field: 'Địa chỉ trụ sở', value: row.address || '---' },
          { field: 'Quốc gia', value: row.country || '---' },
          { field: 'Ghi chú thêm', value: row.notes || '---' },
          { field: 'Trạng thái', value: row.is_active ? 'Đang hợp tác' : 'Ngừng hợp tác' },
          { field: 'Ngày tạo hồ sơ', value: formatDate(row.created_at) }
        ]);
      } else if (mainTab === 'permission') {
        if (subTabKey === 'subtab1') {
          const res = await hrService.getPositionEmployees(row.id);
          setSubTableData(res || []);
        } else if (subTabKey === 'subtab2') {
          if (row.stages && Array.isArray(row.stages)) {
            setSubTableData(row.stages);
          } else {
            try {
              const res = await api.get(`/permissions/${row.id}/stages`);
              setSubTableData(res || []);
            } catch (e) {
              setSubTableData([]);
            }
          }
        } else if (subTabKey === 'subtab3') {
          let perms = {};
          try { perms = JSON.parse(row.default_permissions || '{}'); } catch (e) {}
          const list = Object.entries(perms).map(([key, level]) => ({ key, level }));
          setSubTableData(list);
        }
      } else if (mainTab === 'inspection_form_type') {
        setSubTableData([
          { field: 'ID định danh', value: row.id },
          { field: 'Mã loại phiếu (Code)', value: row.code },
          { field: 'Tên loại phiếu', value: row.name },
          { field: 'Tên hiển thị rút gọn / Badge', value: row.short_name || '---' },
          { field: 'Đường dẫn Mobile (Route)', value: row.route_path || '---' },
          { field: 'Mô tả / Phạm vi áp dụng', value: row.description || '---' },
          { field: 'Màu nhận diện', value: row.color || '#0284C7' },
          { field: 'Thứ tự hiển thị', value: row.display_order ?? 0 },
          { field: 'Phân loại', value: row.is_system ? 'Mặc định hệ thống' : 'Tùy biến (Custom)' },
          { field: 'Trạng thái', value: row.is_active ? 'Đang kích hoạt' : 'Tạm ẩn' },
          { field: 'Ngày tạo', value: formatDate(row.created_at) }
        ]);
      } else if (mainTab === 'inspection_parameter') {
        setSubTableData([
          { field: 'ID định danh', value: row.id },
          { field: 'Mã thông số (Code)', value: row.code },
          { field: 'Tên thông số kỹ thuật', value: row.name },
          { field: 'Đơn vị đo', value: row.unit || '---' },
          { field: 'Khoảng chuẩn mặc định', value: (row.default_min != null && row.default_max != null) ? `${row.default_min} ~ ${row.default_max} ${row.unit || ''}` : '---' },
          { field: 'Thứ tự hiển thị', value: row.display_order ?? 0 },
          { field: 'Trạng thái', value: row.is_active ? 'Đang kích hoạt' : 'Tạm ẩn' },
          { field: 'Ngày tạo', value: formatDate(row.created_at) }
        ]);
      }
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải dữ liệu bảng phụ!');
    } finally {
      setSubTableLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRow) {
      fetchSubTableData(selectedRow, activeTab, activeSubTab);
    } else {
      setSubTableData([]);
    }
  }, [selectedRow, activeSubTab]);

  // SUB-TABLE CRUD LINK HANDLERS
  const handleOpenLinkModal = async () => {
    if (!selectedRow) return;
    setSelectedOptionId('');
    setLinkSubmitting(false);

    try {
      if (activeTab === 'factory' && activeSubTab === 'subtab1') {
        const allDepts = await hrService.getDepartments();
        const existingIds = (subTableData || []).map(x => x.department_id || x.id);
        const filtered = (allDepts || []).filter(d => !existingIds.includes(d.id));
        setAvailableOptions(filtered);
        setIsLinkModalOpen(true);
      } else if (activeTab === 'department' && activeSubTab === 'subtab1') {
        const allPositions = await hrService.getPositions();
        const existingIds = (subTableData || []).map(x => x.position_id || x.id);
        const filtered = (allPositions || []).filter(p => !existingIds.includes(p.id));
        setAvailableOptions(filtered);
        setIsLinkModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể tải danh sách liên kết!');
    }
  };

  const handleSaveLink = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOptionId || !selectedRow) return;
    setLinkSubmitting(true);
    try {
      if (activeTab === 'factory' && activeSubTab === 'subtab1') {
        await hrService.addFactoryDepartment(selectedRow.id, parseInt(selectedOptionId));
        toast('success', 'Đã liên kết phòng ban vào nhà máy!');
      } else if (activeTab === 'department' && activeSubTab === 'subtab1') {
        await hrService.addDepartmentPosition(selectedRow.id, parseInt(selectedOptionId));
        toast('success', 'Đã liên kết vị trí vào bộ phận!');
      }
      setIsLinkModalOpen(false);
      fetchSubTableData(selectedRow, activeTab, activeSubTab);
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Liên kết thất bại!');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleRemoveLink = async (item) => {
    if (!selectedRow) return;
    try {
      if (activeTab === 'factory' && activeSubTab === 'subtab1') {
        const deptId = item.department_id || item.id;
        await hrService.removeFactoryDepartment(selectedRow.id, deptId);
        toast('success', 'Đã xóa liên kết phòng ban!');
      } else if (activeTab === 'department' && activeSubTab === 'subtab1') {
        const posId = item.position_id || item.id;
        await hrService.removeDepartmentPosition(selectedRow.id, posId);
        toast('success', 'Đã xóa liên kết vị trí!');
      }
      fetchSubTableData(selectedRow, activeTab, activeSubTab);
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Xóa liên kết thất bại!');
    }
  };


  // Clean data searching
  const filteredData = useMemo(() => {
    if (activeTab === 'sidebar') {
      return dataList.filter(m => m.platform === sidebarPlatform);
    }
    if (!searchQuery) return dataList;
    const query = searchQuery.toLowerCase();
    return dataList.filter(item => {
      if (activeTab === 'factory') {
        return (item.structure_name || '').toLowerCase().includes(query) ||
               (item.structure_code || '').toLowerCase().includes(query) ||
               (item.structure_type || '').toLowerCase().includes(query);
      }
      if (activeTab === 'department') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.role_name || '').toLowerCase().includes(query);
      }
      if (activeTab === 'position') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query);
      }
      if (activeTab === 'role') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'category') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'stage') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'customer') {
        return (item.code || '').toLowerCase().includes(query) ||
               (item.name || '').toLowerCase().includes(query) ||
               (item.contact_person || '').toLowerCase().includes(query) ||
               (item.phone || '').toLowerCase().includes(query) ||
               (item.email || '').toLowerCase().includes(query);
      }
      if (activeTab === 'permission') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'defect_category') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.prefix || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'inspection_form_type') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.short_name || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      if (activeTab === 'inspection_parameter') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.unit || '').toLowerCase().includes(query);
      }
      if (activeTab === 'iso_document_type') {
        return (item.name || '').toLowerCase().includes(query) ||
               (item.code || '').toLowerCase().includes(query) ||
               (item.description || '').toLowerCase().includes(query);
      }
      return false;
    });
  }, [dataList, searchQuery, activeTab, sidebarPlatform]);

  // Sidebar Tree collapse state toggle
  const toggleCollapse = (itemId) => {
    setCollapsedGroupIds(prev => ({
      ...prev,
      [itemId]: prev[itemId] === false ? true : false
    }));
  };

  // OPEN DIALOGS
  const handleOpenAddModal = () => {
    setSelectedItem(null);
    if (activeTab === 'factory') {
      setFactoryCode('');
      setFactoryName('');
      setFactoryType('Nhà máy');
      setFactoryParentId('');
      setFactoryDesc('');
    } else if (activeTab === 'department') {
      setGeneralCode('');
      setGeneralName('');
      setGeneralDesc('');
      setDeptRoleId('');
      setDeptResponsibilityScope('');
    } else if (activeTab === 'position') {
      setGeneralCode('');
      setGeneralName('');
      setGeneralDesc('');
    } else if (activeTab === 'category') {
      setCatName('');
      setCatDesc('');
      setCatMainCategory('');
    } else if (activeTab === 'defect_category') {
      setDefectCatCode('');
      setDefectCatName('');
      setDefectCatPrefix('');
      setDefectCatDesc('');
      setDefectCatOrder(dataList.length + 1);
      setDefectCatIsActive(true);
    } else if (activeTab === 'stage') {
      const maxSeq = (dataList || []).reduce((max, item) => Math.max(max, item.sequence || 0), 0);
      const nextSeq = maxSeq + 1;
      const autoCode = `CD${String((dataList || []).length + 1).padStart(2, '0')}`;
      setStageCode(autoCode);
      setStageName('');
      setStageSequence(nextSeq);
      setStageIsActive(true);
      setStageDesc('');
    } else if (activeTab === 'customer') {
      setCustCode('');
      setCustName('');
      setCustContact('');
      setCustPhone('');
      setCustEmail('');
      setCustAddress('');
      setCustTax('');
      setCustCountry('Vietnam');
      setCustNotes('');
    } else if (activeTab === 'permission') {
      setPermName('');
      setPermDesc('');
      setPermRoleId('');
      setPermDeptId('');
      setPermIsActive(true);
      if (!deptOptions || deptOptions.length === 0) {
        api.get('/departments/').then(res => setDeptOptions(Array.isArray(res) ? res : (res?.data || [])));
      }
      if (!roleOptions || roleOptions.length === 0) {
        api.get('/roles/?include_inactive=true').then(res => setRoleOptions(Array.isArray(res) ? res : (res?.data || [])));
      }
    } else if (activeTab === 'role') {
      // Handled separately via DepartmentModal
    } else if (activeTab === 'sidebar') {
      setFormTitle('');
      setFormParentId('');
      setFormRoutePath('');
      setFormIcon('LayoutGrid');
      setFormPermissionKey('');
      setFormIsActive(true);
    } else if (activeTab === 'inspection_form_type') {
      setFormTypeCode('');
      setFormTypeName('');
      setFormTypeShortName('');
      setFormTypeDesc('');
      setFormTypeRoute('/production_v2/inspection/first-sample');
      setFormTypeColor('#0284C7');
      setFormTypeBgColor('#F0F9FF');
      setFormTypeOrder((dataList || []).length + 1);
      setFormTypeIsActive(true);
    } else if (activeTab === 'inspection_parameter') {
      setParamCode('');
      setParamName('');
      setParamUnit('');
      setParamMin('');
      setParamMax('');
      setParamOrder((dataList || []).length + 1);
      setParamIsActive(true);
    } else if (activeTab === 'iso_document_type') {
      setIsoDocTypeName('');
      setIsoDocTypeCode('');
      setIsoDocTypeDesc('');
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'factory') {
      setFactoryCode(item.structure_code || '');
      setFactoryName(item.structure_name || '');
      setFactoryType(item.structure_type || 'Nhà máy');
      setFactoryParentId(item.parent_id ? String(item.parent_id) : '');
      setFactoryDesc(item.description || '');
    } else if (activeTab === 'department') {
      setGeneralCode(item.code || '');
      setGeneralName(item.name || '');
      setGeneralDesc('');
      setDeptRoleId(item.role_id ? String(item.role_id) : '');
      setDeptResponsibilityScope(item.responsibility_scope || '');
    } else if (activeTab === 'position') {
      setGeneralCode(item.code || '');
      setGeneralName(item.name || '');
      setGeneralDesc(item.description || '');
    } else if (activeTab === 'category') {
      setCatName(item.name || '');
      setCatDesc(item.description || '');
      setCatMainCategory(item.main_category || '');
    } else if (activeTab === 'defect_category') {
      setDefectCatCode(item.code || '');
      setDefectCatName(item.name || '');
      setDefectCatPrefix(item.prefix || '');
      setDefectCatDesc(item.description || '');
      setDefectCatOrder(item.order_index ?? 0);
      setDefectCatIsActive(item.is_active !== false);
    } else if (activeTab === 'stage') {
      setStageCode(item.code || '');
      setStageName(item.name || '');
      setStageSequence(item.sequence ?? 0);
      setStageIsActive(item.is_active !== false);
      setStageDesc(item.description || '');
    } else if (activeTab === 'customer') {
      setCustCode(item.code || '');
      setCustName(item.name || '');
      setCustContact(item.contact_person || '');
      setCustPhone(item.phone || '');
      setCustEmail(item.email || '');
      setCustAddress(item.address || '');
      setCustTax(item.tax_code || '');
      setCustCountry(item.country || '');
      setCustNotes(item.notes || '');
    } else if (activeTab === 'permission') {
      setPermName(item.name || '');
      setPermDesc(item.description || '');
      setPermIsActive(item.is_active !== false);
      const deptId = item.department_id ? String(item.department_id) : '';
      let roleId = item.role_id ? String(item.role_id) : '';
      if (!roleId && deptId && deptOptions.length > 0) {
        const foundDept = deptOptions.find(d => String(d.id) === deptId);
        if (foundDept && foundDept.role_id) {
          roleId = String(foundDept.role_id);
        }
      }
      setPermRoleId(roleId);
      setPermDeptId(deptId);
      if (!deptOptions || deptOptions.length === 0) {
        api.get('/departments/').then(res => {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setDeptOptions(list);
          if (!roleId && deptId) {
            const foundDept = list.find(d => String(d.id) === deptId);
            if (foundDept && foundDept.role_id) {
              setPermRoleId(String(foundDept.role_id));
            }
          }
        });
      }
      if (!roleOptions || roleOptions.length === 0) {
        api.get('/roles/?include_inactive=true').then(res => setRoleOptions(Array.isArray(res) ? res : (res?.data || [])));
      }
    } else if (activeTab === 'role') {
      // Handled separately
    } else if (activeTab === 'sidebar') {
      setFormTitle(item.title || '');
      setFormParentId(item.parent_id ? String(item.parent_id) : '');
      setFormRoutePath(item.route_path || '');
      setFormIcon(item.icon || 'LayoutGrid');
      setFormPermissionKey(item.permission_key || '');
      setFormIsActive(item.is_active);
    } else if (activeTab === 'inspection_form_type') {
      setFormTypeCode(item.code || '');
      setFormTypeName(item.name || '');
      setFormTypeShortName(item.short_name || '');
      setFormTypeDesc(item.description || '');
      setFormTypeRoute(item.route_path || '');
      setFormTypeColor(item.color || '#0284C7');
      setFormTypeBgColor(item.bg_color || '#F0F9FF');
      setFormTypeOrder(item.display_order ?? 0);
      setFormTypeIsActive(item.is_active !== false);
    } else if (activeTab === 'inspection_parameter') {
      setParamCode(item.code || '');
      setParamName(item.name || '');
      setParamUnit(item.unit || '');
      setParamMin(item.default_min != null ? String(item.default_min) : '');
      setParamMax(item.default_max != null ? String(item.default_max) : '');
      setParamOrder(item.display_order ?? 0);
      setParamIsActive(item.is_active !== false);
    } else if (activeTab === 'iso_document_type') {
      setIsoDocTypeName(item.name || '');
      setIsoDocTypeCode(item.code || '');
      setIsoDocTypeDesc(item.description || '');
    }
    setIsModalOpen(true);
  };

  // CONFIRM SAVE
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      if (activeTab === 'factory') {
        const payload = {
          structure_code: factoryCode.trim(),
          structure_name: factoryName.trim(),
          structure_type: factoryType,
          parent_id: factoryParentId ? parseInt(factoryParentId) : null,
          description: factoryDesc.trim() || null
        };
        if (selectedItem) {
          if (selectedItem.id === null) {
            await hrService.upsertFactoryStructure(payload.structure_code, payload);
            toast('success', 'Đồng bộ cấu trúc nhà máy thành công!');
          } else {
            await hrService.updateFactoryStructure(selectedItem.id, payload);
            toast('success', 'Cập nhật cấu trúc nhà máy thành công!');
          }
        } else {
          await hrService.createFactoryStructure(payload);
          toast('success', 'Thêm mới cấu trúc nhà máy thành công!');
        }
      } else if (activeTab === 'department') {
        const payload = {
          code: generalCode.trim(),
          name: generalName.trim(),
          role_id: parseInt(deptRoleId),
          responsibility_scope: deptResponsibilityScope.trim() || null
        };
        if (selectedItem) {
          await api.put(`/departments/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật bộ phận thành công!');
        } else {
          await api.post('/departments/', payload);
          toast('success', 'Thêm mới bộ phận thành công!');
        }
      } else if (activeTab === 'position') {
        const payload = {
          code: generalCode.trim(),
          name: generalName.trim(),
          description: generalDesc.trim() || null
        };
        if (selectedItem) {
          await hrService.updatePosition(selectedItem.id, payload);
          toast('success', 'Cập nhật vị trí thành công!');
        } else {
          await hrService.createPosition(payload);
          toast('success', 'Thêm mới vị trí thành công!');
        }
      } else if (activeTab === 'category') {
        const payload = {
          name: catName.trim(),
          description: catDesc.trim() || null,
          main_category: catMainCategory || null,
          status: 1
        };
        if (selectedItem) {
          await api.put(`/master-categories/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật dòng hàng thành công!');
        } else {
          await api.post('/master-categories/', payload);
          toast('success', 'Thêm mới dòng hàng thành công!');
        }
      } else if (activeTab === 'defect_category') {
        const payload = {
          code: defectCatCode.trim().toLowerCase(),
          name: defectCatName.trim(),
          prefix: defectCatPrefix.trim().toUpperCase(),
          description: defectCatDesc.trim() || null,
          order_index: parseInt(defectCatOrder) || 0,
          is_active: defectCatIsActive
        };
        if (selectedItem) {
          await api.put(`/inspections/defect-categories/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật phân nhóm lỗi QC thành công!');
        } else {
          await api.post('/inspections/defect-categories', payload);
          toast('success', 'Thêm mới phân nhóm lỗi QC thành công!');
        }
      } else if (activeTab === 'stage') {
        const payload = {
          code: stageCode.trim() || null,
          name: stageName.trim(),
          sequence: parseInt(stageSequence) || 0,
          is_active: stageIsActive,
          description: stageDesc.trim() || null
        };
        if (selectedItem) {
          await api.put(`/stages/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật công đoạn thành công!');
        } else {
          await api.post('/stages/', payload);
          toast('success', 'Thêm mới công đoạn thành công!');
        }
      } else if (activeTab === 'customer') {
        const payload = {
          code: custCode.trim(),
          name: custName.trim(),
          contact_person: custContact.trim() || null,
          phone: custPhone.trim() || null,
          email: custEmail.trim() || null,
          address: custAddress.trim() || null,
          tax_code: custTax.trim() || null,
          country: custCountry.trim() || null,
          notes: custNotes.trim() || null,
          is_active: 1
        };
        if (selectedItem) {
          await api.put(`/customers/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật thông tin khách hàng thành công!');
        } else {
          await api.post('/customers/', payload);
          toast('success', 'Thêm mới khách hàng thành công!');
        }
      } else if (activeTab === 'permission') {
        const payload = {
          name: permName.trim(),
          description: permDesc.trim() || null,
          role_id: permRoleId ? parseInt(permRoleId) : null,
          department_id: permDeptId ? parseInt(permDeptId) : null,
          is_active: permIsActive
        };
        if (selectedItem) {
          await api.put(`/permissions/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật chức vụ/vị trí thành công!');
        } else {
          await api.post('/permissions/', payload);
          toast('success', 'Thêm mới chức vụ/vị trí thành công!');
        }
      } else if (activeTab === 'sidebar') {
        const payload = {
          platform: sidebarPlatform,
          parent_id: formParentId ? parseInt(formParentId) : null,
          title: formTitle.trim(),
          route_path: formRoutePath.trim() || null,
          icon: formIcon || null,
          permission_key: formPermissionKey.trim() || null,
          screen_id: null,
          is_active: formIsActive
        };
        if (selectedItem) {
          await api.put(`/system/sidebar/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật menu sidebar thành công!');
        } else {
          // Sort order calculation
          const siblings = formParentId 
            ? (dataList.find(m => m.id === parseInt(formParentId))?.children || [])
            : filteredData;
          payload.sort_order = siblings.length + 1;
          await api.post('/system/sidebar', payload);
          toast('success', 'Thêm mới menu sidebar thành công!');
        }
      } else if (activeTab === 'inspection_form_type') {
        const payload = {
          code: formTypeCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          name: formTypeName.trim(),
          short_name: formTypeShortName.trim() || formTypeName.trim(),
          description: formTypeDesc.trim() || null,
          route_path: formTypeRoute.trim() || null,
          color: formTypeColor,
          bg_color: formTypeBgColor,
          display_order: parseInt(formTypeOrder) || 0,
          is_active: formTypeIsActive
        };
        if (selectedItem) {
          await api.put(`/inspection-form-types/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật loại phiếu kiểm tra thành công!');
        } else {
          await api.post('/inspection-form-types', payload);
          toast('success', 'Thêm mới loại phiếu kiểm tra thành công!');
        }
      } else if (activeTab === 'inspection_parameter') {
        const payload = {
          code: paramCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          name: paramName.trim(),
          unit: paramUnit.trim() || null,
          default_min: paramMin !== '' ? parseFloat(paramMin) : null,
          default_max: paramMax !== '' ? parseFloat(paramMax) : null,
          display_order: parseInt(paramOrder) || 0,
          is_active: paramIsActive
        };
        if (selectedItem) {
          await api.put(`/inspection-parameters/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật thông số kiểm tra thành công!');
        } else {
          await api.post('/inspection-parameters', payload);
          toast('success', 'Thêm mới thông số kiểm tra thành công!');
        }
      } else if (activeTab === 'iso_document_type') {
        const payload = {
          name: isoDocTypeName.trim(),
          code: isoDocTypeCode.trim().toUpperCase(),
          description: isoDocTypeDesc.trim() || null
        };
        if (selectedItem) {
          await api.put(`/iso-documents/types/${selectedItem.id}`, payload);
          toast('success', 'Cập nhật loại hồ sơ ISO thành công!');
        } else {
          await api.post('/iso-documents/types', payload);
          toast('success', 'Thêm mới loại hồ sơ ISO thành công!');
        }
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lưu cấu hình thất bại!');
    }
  };

  // HANDLE DELETE
  const handleOpenDeleteModal = (item) => {
    setDeletingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      if (activeTab === 'factory') {
        await hrService.deleteFactoryStructure(deletingItem.id);
      } else if (activeTab === 'department') {
        await api.delete(`/departments/${deletingItem.id}`);
      } else if (activeTab === 'position') {
        await hrService.deletePosition(deletingItem.id);
      } else if (activeTab === 'role') {
        await api.delete(`/roles/${deletingItem.id}`);
      } else if (activeTab === 'category') {
        await api.delete(`/master-categories/${deletingItem.id}`);
      } else if (activeTab === 'defect_category') {
        await api.delete(`/inspections/defect-categories/${deletingItem.id}`);
      } else if (activeTab === 'stage') {
        await api.delete(`/stages/${deletingItem.id}`);
      } else if (activeTab === 'customer') {
        await api.delete(`/customers/${deletingItem.id}`);
      } else if (activeTab === 'permission') {
        await api.delete(`/permissions/${deletingItem.id}`);
      } else if (activeTab === 'sidebar') {
        await api.delete(`/system/sidebar/${deletingItem.id}`);
      } else if (activeTab === 'inspection_form_type') {
        if (deletingItem.is_system) {
          toast('warning', 'Không thể xóa loại phiếu mặc định hệ thống. Bạn có thể chọn tắt kích hoạt.');
          setIsDeleteModalOpen(false);
          setDeletingItem(null);
          return;
        }
        await api.delete(`/inspection-form-types/${deletingItem.id}`);
      } else if (activeTab === 'inspection_parameter') {
        await api.delete(`/inspection-parameters/${deletingItem.id}`);
      } else if (activeTab === 'iso_document_type') {
        await api.delete(`/iso-documents/types/${deletingItem.id}`);
      }
      toast('success', 'Xóa cấu hình thành công!');
      setIsDeleteModalOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Không thể xóa cấu hình này!');
    }
  };

  const handleSyncFromBOM = async () => {
    setLoading(true);
    try {
      await hrService.syncFactoryStructuresFromBOM();
      toast('success', 'Cập nhật và đồng bộ cấu trúc nhà máy từ dữ liệu BOM thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      toast('error', 'Cập nhật từ dữ liệu BOM thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // SIDEBAR SPECIFIC: MOVE UP / DOWN
  const handleSidebarMove = async (item, direction) => {
    const siblings = item.parent_id
      ? (dataList.find(m => m.id === item.parent_id)?.children || [])
      : filteredData;

    const currentIndex = siblings.findIndex(s => s.id === item.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetItem = siblings[targetIndex];

    const updatedItems = [
      { id: item.id, parent_id: item.parent_id, sort_order: targetItem.sort_order },
      { id: targetItem.id, parent_id: targetItem.parent_id, sort_order: item.sort_order }
    ];

    try {
      await api.put('/system/sidebar/reorder', { items: updatedItems });
      toast('success', 'Đã sắp xếp lại thứ tự menu!');
      loadData();
    } catch (err) {
      toast('error', 'Sắp xếp menu thất bại!');
    }
  };

  // SIDEBAR TREE RENDERER
  const renderSidebarNode = (item, depth = 0) => {
    const isParent = item.children && item.children.length > 0;
    const paddingLeft = `${depth * 28 + 16}px`;
    const isCollapsed = depth === 0 && isParent && collapsedGroupIds[item.id] !== false;

    return (
      <React.Fragment key={item.id}>
        <div 
          onClick={() => setSelectedRow(selectedRow?.id === item.id ? null : item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px 12px ' + paddingLeft,
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: selectedRow?.id === item.id ? '#FAF6F0' : (!item.is_active ? '#F9FAFB' : '#FFFFFF'),
            borderLeft: selectedRow?.id === item.id ? '4px solid #7B5233' : '4px solid transparent',
            opacity: item.is_active ? 1 : 0.6,
            cursor: 'pointer'
          }}
          className="menu-row-item"
        >
          <div 
            onClick={() => {
              if (depth === 0 && isParent) {
                toggleCollapse(item.id);
              }
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              flex: 1, 
              minWidth: 0,
              cursor: (depth === 0 && isParent) ? 'pointer' : 'default',
              userSelect: 'none'
            }}
          >
            {depth === 0 && isParent && (
              <span style={{ 
                color: '#9CA3AF', 
                display: 'flex', 
                alignItems: 'center',
                transition: 'transform 0.2s',
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)'
              }}>
                <ChevronRight size={16} />
              </span>
            )}
            <span style={{ color: '#7B5233', display: 'flex', alignItems: 'center' }}>
              <DynamicIcon name={item.icon} size={depth === 0 ? 18 : 14} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ 
                fontWeight: depth === 0 ? 800 : 600, 
                color: depth === 0 ? '#1F2937' : '#4B5563',
                fontSize: depth === 0 ? '0.95rem' : '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.title}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.route_path || '---'} {item.permission_key ? `[Quyền: ${item.permission_key}]` : ''}
              </span>
            </div>
            {!item.is_active && (
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: '#E5E7EB',
                color: '#6B7280',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                Ẩn
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <button 
              onClick={() => handleSidebarMove(item, 'up')}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4B5563'
              }}
              title="Di chuyển lên"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              onClick={() => handleSidebarMove(item, 'down')}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4B5563'
              }}
              title="Di chuyển xuống"
            >
              <ArrowDown size={14} />
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />

            {depth === 0 && (
              <button 
                onClick={() => {
                  setSelectedItem(null);
                  setFormTitle('');
                  setFormParentId(String(item.id));
                  setFormRoutePath('');
                  setFormIcon('LayoutGrid');
                  setFormPermissionKey('');
                  setFormIsActive(true);
                  setIsModalOpen(true);
                }}
                style={{
                  border: '1px solid #7B5233',
                  backgroundColor: '#FAF6F0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
                title="Thêm mục con"
              >
                <Plus size={12} />
                <span>Mục con</span>
              </button>
            )}

            <button 
              onClick={() => handleOpenEditModal(item)}
              style={{
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#2563EB'
              }}
              title="Chỉnh sửa"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={() => handleOpenDeleteModal(item)}
              style={{
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#EF4444'
              }}
              title="Xóa mục"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {isParent && !isCollapsed && item.children.map(child => renderSidebarNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // ROLE SPECIFIC HANDLERS
  const handleRoleConfirm = async (roleData) => {
    try {
      if (selectedItem) {
        // Edit Role
        await api.put(`/roles/${selectedItem.id}`, roleData);
        toast('success', `Đã cập nhật bộ phận "${roleData.name}" thành công!`);
      } else {
        // Create Role
        await api.post('/roles/', roleData);
        toast('success', `Đã tạo mới bộ phận "${roleData.name}" thành công!`);
      }
      setIsModalOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (err) {
      toast('error', err.response?.data?.detail || 'Lưu bộ phận thất bại!');
    }
  };

  // FORMAT DATE HELPER
  const formatDate = (rawStr) => {
    if (!rawStr) return '---';
    try {
      const dt = new Date(rawStr);
      if (isNaN(dt.getTime())) return rawStr;
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return rawStr;
    }
  };

  return (
    <div className="system-config-container" style={{ fontFamily: 'Inter, sans-serif', padding: '20px', backgroundColor: '#F9FBFB', minHeight: '100%', boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-content:has(.system-config-container) {
          overflow-y: auto !important;
        }
        .dashboard-content:has(.system-config-container) > div {
          height: auto !important;
          min-height: 100% !important;
          overflow-y: visible !important;
          flex: none !important;
        }
      `}} />
      
      {/* 2-Pane Master-Detail Flex Layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Pane (Master Navigation Menu) */}
        <div style={{
          width: '280px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          padding: '20px 16px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#7B5233',
            borderBottom: '2px dashed #F3F4F6',
            paddingBottom: '12px'
          }}>
            Thông tin cần cấu hình
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* GROUP 1: CƠ CẤU TỔ CHỨC */}
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', padding: '8px 10px 4px 10px', letterSpacing: '0.5px' }}>
              CƠ CẤU TỔ CHỨC
            </div>
            {[
              { id: 'factory', label: 'Nhà máy', icon: Building2 },
              { id: 'role', label: 'Phòng ban', icon: Users },
              { id: 'department', label: 'Bộ phận', icon: Layers },
              { id: 'permission', label: 'Vị trí', icon: ShieldCheck }
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#4B5563',
                    fontWeight: isSelected ? '800' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IconComp size={17} style={{ color: isSelected ? '#7B5233' : '#6B7280' }} />
                  <span style={{ fontSize: '0.84rem' }}>{tab.label}</span>
                </button>
              );
            })}

            {/* GROUP 2: HỆ THỐNG & PHÂN QUYỀN */}
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', padding: '12px 10px 4px 10px', letterSpacing: '0.5px', borderTop: '1px solid #F3F4F6', marginTop: '4px' }}>
              HỆ THỐNG & PHÂN QUYỀN
            </div>
            {[
              { id: 'sidebar', label: 'Cấu hình Sidebar', icon: Sliders }
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#4B5563',
                    fontWeight: isSelected ? '800' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IconComp size={17} style={{ color: isSelected ? '#7B5233' : '#6B7280' }} />
                  <span style={{ fontSize: '0.84rem' }}>{tab.label}</span>
                </button>
              );
            })}

            {/* GROUP 3: DANH MỤC DỮ LIỆU */}
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', padding: '12px 10px 4px 10px', letterSpacing: '0.5px', borderTop: '1px solid #F3F4F6', marginTop: '4px' }}>
              DANH MỤC DỮ LIỆU
            </div>
            {[
              { id: 'category', label: 'Dòng hàng', icon: Tag },
              { id: 'stage', label: 'Công đoạn SX', icon: Factory },
              { id: 'defect_category', label: 'Phân nhóm lỗi QC', icon: AlertOctagon },
              { id: 'qc_sampling', label: 'Quy tắc lấy mẫu QC', icon: Sliders },
              { id: 'inspection_form_type', label: 'Loại phiếu kiểm tra', icon: ClipboardCheck },
              { id: 'inspection_parameter', label: 'Thông số kiểm tra', icon: Sliders },
              { id: 'iso_document_type', label: 'Loại hồ sơ (ISO)', icon: FileText },
              { id: 'customer', label: 'Khách hàng', icon: Contact }
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#4B5563',
                    fontWeight: isSelected ? '800' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IconComp size={17} style={{ color: isSelected ? '#7B5233' : '#6B7280' }} />
                  <span style={{ fontSize: '0.84rem' }}>{tab.label}</span>
                </button>
              );
            })}

            {/* GROUP 4: SẢN PHẨM MẪU (CHUYÊN BIỆT) */}
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', padding: '12px 10px 4px 10px', letterSpacing: '0.5px', borderTop: '1px solid #F3F4F6', marginTop: '4px' }}>
              SẢN PHẨM MẪU (CHUYÊN BIỆT)
            </div>
            {[
              { id: 'paint_color', label: 'Quản lý Màu sơn', icon: Palette },
              { id: 'product_detail', label: 'Quản lý Chi tiết SP', icon: ClipboardList }
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    width: '100%',
                    border: 'none',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                    color: isSelected ? '#7B5233' : '#4B5563',
                    fontWeight: isSelected ? '800' : '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <IconComp size={17} style={{ color: isSelected ? '#7B5233' : '#6B7280' }} />
                  <span style={{ fontSize: '0.84rem' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane (Detail Config Panel) */}
        <div style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          overflow: 'visible'
        }}>
          {activeTab === 'paint_color' ? (
            <PaintColorManagementView isEmbedded={true} />
          ) : activeTab === 'product_detail' ? (
            <ProductDetailsManagementView isEmbedded={true} />
          ) : activeTab === 'qc_sampling' ? (
            <QCSamplingConfigView isEmbedded={true} />
          ) : (
            <>
              {/* Right Header & Search tool */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FAF8F6',
                gap: '16px'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#2D1A12', fontWeight: 800 }}>
                    {activeTab === 'factory' && 'Danh mục Cấu trúc nhà máy'}
                {activeTab === 'department' && 'Danh mục Bộ phận'}
                {activeTab === 'position' && 'Danh mục Chức danh'}
                {activeTab === 'role' && 'Danh mục Phòng ban'}
                {activeTab === 'sidebar' && 'Cấu hình Menu Sidebar'}
                {activeTab === 'category' && 'Danh mục Dòng hàng sản phẩm'}
                {activeTab === 'stage' && 'Danh mục Công đoạn sản xuất'}
                {activeTab === 'customer' && 'Danh mục Khách hàng & Đối tác'}
                {activeTab === 'permission' && 'Danh mục Vị trí'}
                {activeTab === 'inspection_form_type' && 'Danh mục Loại phiếu kiểm tra'}
                {activeTab === 'inspection_parameter' && 'Danh mục Thông số đo kiểm tra'}
                {activeTab === 'iso_document_type' && 'Danh mục Loại hồ sơ / Tài liệu ISO'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
                {activeTab === 'factory' && 'Quản lý sơ đồ các Nhà máy, Phân xưởng và Tổ sản xuất vật lý.'}
                {activeTab === 'department' && 'Quản lý các bộ phận thuộc phòng ban.'}
                {activeTab === 'position' && 'Thiết lập danh mục chức danh công tác trong công ty.'}
                {activeTab === 'role' && 'Cấu hình các phòng ban và nhóm phân quyền màn hình tương ứng.'}
                {activeTab === 'sidebar' && 'Thiết lập lưu đồ menu điều hướng cho bản Web và Mobile.'}
                {activeTab === 'category' && 'Quản lý các dòng hàng mẫu và danh mục sản phẩm của toàn hệ thống.'}
                {activeTab === 'stage' && 'Quản lý danh sách các công đoạn sản xuất tại các nhà máy và xưởng.'}
                {activeTab === 'defect_category' && 'Quản lý phân nhóm lỗi QC (ngoại quan, sơn, kết cấu, vật tư...).'}
                {activeTab === 'customer' && 'Quản lý danh bạ khách hàng, đối tác, mã số thuế và thông tin liên hệ.'}
                {activeTab === 'permission' && 'Thiết lập vị trí, gán công đoạn phụ trách và quyền thao tác.'}
                {activeTab === 'inspection_form_type' && 'Quản lý danh sách các loại phiếu kiểm tra (Đồng bộ trực tiếp với Mobile dropdown Chọn cách kiểm tra và Quản lý Hướng dẫn).'}
                {activeTab === 'inspection_parameter' && 'Quản lý danh mục các thông số kỹ thuật đo đạc (Độ ẩm, Nhiệt độ, Ánh sáng, Độ bóng sơn...) áp dụng cho phiếu kiểm tra.'}
                {activeTab === 'iso_document_type' && 'Quản lý tên, mã viết tắt (QT, HD, CS, BM...) và mô tả các loại hồ sơ quy trình chuẩn.'}
              </p>
            </div>

            {/* General Actions & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeTab === 'sidebar' ? (
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#E5E7EB', padding: '2px', borderRadius: '8px' }}>
                  {['Web', 'Mobile'].map(plat => (
                    <button
                      key={plat}
                      onClick={() => setSidebarPlatform(plat)}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: sidebarPlatform === plat ? '#FFFFFF' : 'transparent',
                        color: sidebarPlatform === plat ? '#7B5233' : '#4B5563',
                        transition: 'all 0.2s'
                      }}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm nhanh..."
                    style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      width: '200px',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <button
                onClick={loadData}
                style={{
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#4B5563'
                }}
                title="Tải lại dữ liệu"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Right Body Table / Tree */}
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>
                Đang tải dữ liệu cấu hình...
              </div>
            ) : activeTab === 'sidebar' ? (
              // SIDEBAR TREE VIEW
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#FAF8F6',
                  borderBottom: '2px solid #E5E7EB',
                  fontWeight: 800,
                  color: '#374151',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ flex: 1 }}>CẤU TRÚC MENU SIDEBAR ({sidebarPlatform.toUpperCase()})</div>
                  <div style={{ width: '280px', textAlign: 'right' }}>THAO TÁC</div>
                </div>
                {filteredData.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Chưa có mục menu nào cho bản {sidebarPlatform}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                    {filteredData.map(menu => renderSidebarNode(menu, 0))}
                  </div>
                )}
              </div>
            ) : (
              // DEFAULT LIST TABLE (FACTORY, DEPT, POSITION, ROLE)
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF' }}>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', width: '60px' }}>STT</th>
                      {activeTab === 'factory' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên nhà máy / phân xưởng</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Phân loại</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả</th>
                        </>
                      )}
                      {activeTab === 'department' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã viết tắt</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên bộ phận</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Phòng ban</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Phạm vi trách nhiệm chốt</th>
                        </>
                      )}
                      {activeTab === 'position' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã viết tắt</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên danh mục</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Diễn giải chi tiết</th>
                        </>
                      )}
                      {activeTab === 'role' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên bộ phận</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả nhiệm vụ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'category' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Dòng hàng</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Dòng hàng chính</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả / Diễn giải</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Số SP mẫu</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'defect_category' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã phân nhóm</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Phân nhóm QC</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Tiền tố mã G7</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Số loại lỗi</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'stage' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã CĐ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Công đoạn SX</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Thứ tự</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả quy trình</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'customer' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã KH</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Khách hàng / Doanh nghiệp</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Người liên hệ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Điện thoại / Email</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Quốc gia</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'permission' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Vị trí</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Thuộc Phòng ban</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Thuộc Bộ phận</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả chức vụ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'inspection_form_type' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã loại phiếu</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên loại phiếu / Nhãn</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Route Mobile</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Thứ tự</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Phân loại</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'inspection_parameter' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã thông số</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên thông số kỹ thuật</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Đơn vị đo</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Khoảng chuẩn mặc định</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Thứ tự</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                        </>
                      )}
                      {activeTab === 'iso_document_type' && (
                        <>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '140px' }}>Mã viết tắt</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '240px' }}>Tên Loại hồ sơ</th>
                          <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mô tả / Diễn giải</th>
                        </>
                      )}
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '120px' }}>Ngày tạo</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, borderTopRightRadius: '8px', borderBottomRightRadius: '8px', width: '100px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                          Không tìm thấy bản ghi cấu hình nào.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          onClick={() => setSelectedRow(selectedRow?.id === item.id ? null : item)}
                          style={{ 
                            borderBottom: '1px solid #F3F4F6', 
                            position: 'relative', 
                            zIndex: actionMenuId === item.id ? 30 : 1,
                            backgroundColor: selectedRow?.id === item.id ? '#FAF6F0' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{idx + 1}</td>
                          
                          {activeTab === 'factory' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.structure_code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{item.structure_name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.structure_type === 'Nhà máy' ? '#FAF6F0' : item.structure_type === 'Phân xưởng' ? '#E0F2FE' : '#DCFCE7',
                                  color: item.structure_type === 'Nhà máy' ? '#7B5233' : item.structure_type === 'Phân xưởng' ? '#0369A1' : '#15803D',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.structure_type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                            </>
                          )}

                          {activeTab === 'department' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.role_name || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>{item.responsibility_scope || '---'}</td>
                            </>
                          )}
                          {activeTab === 'position' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                            </>
                          )}

                          {activeTab === 'role' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'category' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Tag size={15} style={{ color: '#7B5233' }} />
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 600 }}>
                                {item.main_category ? (
                                  <span style={{
                                    backgroundColor: item.main_category === 'Vanity' ? '#EDE9FE' : item.main_category === 'Furniture' ? '#FEF3C7' : '#E2E8F0',
                                    color: item.main_category === 'Vanity' ? '#6D28D9' : item.main_category === 'Furniture' ? '#D97706' : '#475569',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem'
                                  }}>
                                    {item.main_category}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.75rem' }}>---</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#FAF6F0', color: '#7B5233', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                  {item.product_count ?? (item.products?.length || 0)} SP
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: (item.status === 1 || item.status === undefined) ? '#DCFCE7' : '#F3F4F6',
                                  color: (item.status === 1 || item.status === undefined) ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {(item.status === 1 || item.status === undefined) ? 'Hiệu lực' : 'Tạm dừng'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'defect_category' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold', fontFamily: 'monospace' }}>{item.code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 700 }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#FAF6F0', color: '#7B5233', border: '1px solid #EADCC9', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {item.prefix}-xxx
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: item.defect_count > 0 ? '#E0F2FE' : '#F3F4F6', color: item.defect_count > 0 ? '#0369A1' : '#6B7280', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                  {item.defect_count || 0} loại lỗi
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Đang sử dụng' : 'Dừng hoạt động'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'stage' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
                                {item.code || '---'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Factory size={15} style={{ color: '#7B5233' }} />
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', color: '#4B5563' }}>
                                {item.sequence ?? 0}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Đang sử dụng' : 'Tạm dừng'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'customer' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>{item.code}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 600 }}>{item.name}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>{item.contact_person || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>
                                <div>{item.phone || '---'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{item.email || ''}</div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>{item.country || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Hợp tác' : 'Tạm dừng'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'permission' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ShieldCheck size={15} style={{ color: '#7B5233' }} />
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>
                                {item.role_name ? (
                                  <span style={{ backgroundColor: '#FAF6F0', color: '#7B5233', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {item.role_name}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.75rem' }}>Toàn công ty</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>
                                {item.department_name ? (
                                  <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {item.department_name}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.75rem' }}>Dùng chung</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>{item.description || '---'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Kích hoạt' : 'Tạm khóa'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'inspection_form_type' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>
                                  {item.code}
                                </code>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    backgroundColor: item.bg_color || '#F0F9FF',
                                    color: item.color || '#0284C7',
                                    border: `1px solid ${item.color || '#0284C7'}33`,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '0.72rem'
                                  }}>
                                    {item.short_name || item.name}
                                  </span>
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748B', fontFamily: 'monospace' }}>
                                {item.route_path || '---'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', color: '#4B5563' }}>
                                {item.display_order ?? 0}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', textAlign: 'center' }}>
                                <span style={{
                                  backgroundColor: item.is_system ? '#F1F5F9' : '#FEF3C7',
                                  color: item.is_system ? '#475569' : '#92400E',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_system ? 'Hệ thống' : 'Tùy biến'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Kích hoạt' : 'Tạm ẩn'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'inspection_parameter' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>
                                  {item.code}
                                </code>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 700 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Sliders size={14} style={{ color: '#7B5233' }} />
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>
                                {item.unit ? (
                                  <span style={{ backgroundColor: '#F5F3FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                                    {item.unit}
                                  </span>
                                ) : '---'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center', color: '#4B5563', fontWeight: 600 }}>
                                {(item.default_min != null && item.default_max != null) ? `${item.default_min} ~ ${item.default_max} ${item.unit || ''}` : '---'}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', color: '#4B5563' }}>
                                {item.display_order ?? 0}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                <span style={{
                                  backgroundColor: item.is_active ? '#DCFCE7' : '#F3F4F6',
                                  color: item.is_active ? '#15803D' : '#6B7280',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.is_active ? 'Kích hoạt' : 'Tạm ẩn'}
                                </span>
                              </td>
                            </>
                          )}

                          {activeTab === 'iso_document_type' && (
                            <>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 'bold' }}>
                                <span style={{ backgroundColor: '#FAF6F0', color: '#7B5233', border: '1px solid #EADCC9', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                  {item.code}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 700 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={15} style={{ color: '#7B5233' }} />
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>
                                {item.description || '---'}
                              </td>
                            </>
                          )}

                          <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#6B7280' }}>
                            {formatDate(item.created_at)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                className="action-btn"
                                onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                              </button>
                              {actionMenuId === item.id && (
                                <div className="action-menu">
                                  <button className="action-menu-item" onClick={() => { setActionMenuId(null); handleOpenEditModal(item); }}>Chỉnh sửa</button>
                                  {!(activeTab === 'factory' && item.id === null) && (
                                    <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); handleOpenDeleteModal(item); }}>Xóa bản ghi</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add New Button Placed at the bottom left of the table/tree as in the mockup */}
            {!loading && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                <button
                  onClick={handleOpenAddModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5ECE1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                >
                  <Plus size={16} />
                  <span>Thêm mới</span>
                </button>

                {activeTab === 'factory' && (
                  <button
                    onClick={handleSyncFromBOM}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #7B5233',
                      backgroundColor: '#FFFFFF',
                      color: '#7B5233',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  >
                    <RefreshCw size={15} />
                    <span>Cập nhật từ BOM</span>
                  </button>
                )}
              </div>
            )}

            {/* SUB-TABLE PANEL WHEN A ROW IS SELECTED */}
            {selectedRow && (
              <div style={{
                marginTop: '20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #7B5233',
                boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)',
                overflow: 'hidden'
              }}>
                {/* SubTable Header */}
                <div style={{
                  padding: '12px 18px',
                  backgroundColor: '#FAF6F0',
                  borderBottom: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} style={{ color: '#7B5233' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#2D1A12' }}>
                      BẢNG PHỤ CẤU HÌNH: <span style={{ color: '#7B5233' }}>{selectedRow.structure_name || selectedRow.name || selectedRow.title}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedRow(null)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}
                    title="Thu gọn bảng phụ"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* SubTab Navigation Headers */}
                <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF', padding: '0 12px' }}>
                  {activeTab === 'factory' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Phòng ban thuộc Nhà máy ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Tổ sản xuất / Cấu trúc con ({subTableData.length})
                      </button>
                    </>
                  )}

                  {activeTab === 'department' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Vị trí trực thuộc ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Nhân viên trực thuộc ({subTableData.length})
                      </button>
                    </>
                  )}

                  {activeTab === 'position' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Nhân viên đảm nhiệm ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Phòng ban sử dụng ({subTableData.length})
                      </button>
                    </>
                  )}

                  {activeTab === 'role' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Bộ phận trực thuộc ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Nhân viên trực thuộc ({subTableData.length})
                      </button>
                    </>
                  )}

                  {activeTab === 'sidebar' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Mục menu con ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Thông số kỹ thuật
                      </button>
                    </>
                  )}

                  {activeTab === 'category' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Sản phẩm mẫu liên kết ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Thông tin chi tiết
                      </button>
                    </>
                  )}

                  {activeTab === 'defect_category' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Các loại lỗi thuộc nhóm ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Thông tin chi tiết
                      </button>
                    </>
                  )}

                  {activeTab === 'stage' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Chức vụ phụ trách ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Thông tin chi tiết
                      </button>
                    </>
                  )}

                  {activeTab === 'customer' && (
                    <button
                      onClick={() => setActiveSubTab('subtab1')}
                      style={{
                        padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '0.82rem', fontWeight: 800,
                        color: '#7B5233',
                        borderBottom: '2px solid #7B5233'
                      }}
                    >
                      Thông tin liên hệ & Pháp lý
                    </button>
                  )}

                  {(activeTab === 'inspection_form_type' || activeTab === 'inspection_parameter') && (
                    <button
                      onClick={() => setActiveSubTab('subtab1')}
                      style={{
                        padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '0.82rem', fontWeight: 800,
                        color: '#7B5233',
                        borderBottom: '2px solid #7B5233'
                      }}
                    >
                      Thông tin chi tiết ({subTableData.length})
                    </button>
                  )}

                  {activeTab === 'permission' && (
                    <>
                      <button
                        onClick={() => setActiveSubTab('subtab1')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab1' ? 800 : 600,
                          color: activeSubTab === 'subtab1' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab1' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Nhân viên đảm nhiệm ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab2')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab2' ? 800 : 600,
                          color: activeSubTab === 'subtab2' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab2' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Công đoạn phụ trách ({subTableData.length})
                      </button>
                      <button
                        onClick={() => setActiveSubTab('subtab3')}
                        style={{
                          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: activeSubTab === 'subtab3' ? 800 : 600,
                          color: activeSubTab === 'subtab3' ? '#7B5233' : '#6B7280',
                          borderBottom: activeSubTab === 'subtab3' ? '2px solid #7B5233' : '2px solid transparent'
                        }}
                      >
                        Quyền mặc định
                      </button>
                    </>
                  )}
                </div>

                {/* SubTable Body */}
                <div style={{ padding: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                  {subTableLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '0.85rem' }}>
                      Đang tải dữ liệu bảng phụ...
                    </div>
                  ) : subTableData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '0.85rem' }}>
                      Chưa có dữ liệu bảng phụ liên kết.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', width: '50px' }}>STT</th>
                          <th style={{ padding: '8px 12px' }}>Tên / Mã</th>
                          <th style={{ padding: '8px 12px' }}>Mô tả / Chi tiết</th>
                          <th style={{ padding: '8px 12px', width: '100px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subTableData.map((stItem, index) => (
                          <tr key={stItem.id || stItem.key || index} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '8px 12px', color: '#6B7280' }}>{index + 1}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1F2937' }}>
                              {stItem.name || stItem.full_name || stItem.title || stItem.code || stItem.key || stItem.field}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#6B7280' }}>
                              {stItem.description || stItem.email || stItem.structure_name || stItem.level || stItem.value || '---'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {((activeTab === 'factory' && activeSubTab === 'subtab1') || (activeTab === 'department' && activeSubTab === 'subtab1')) ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveLink(stItem); }}
                                  style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }}
                                  title="Gỡ liên kết"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : (
                                <span style={{ color: '#D1D5DB' }}>---</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Action Add Button for Sub-table CRUD */}
                  {((activeTab === 'factory' && activeSubTab === 'subtab1') || (activeTab === 'department' && activeSubTab === 'subtab1')) && (
                    <div style={{ marginTop: '12px' }}>
                      <button
                        onClick={handleOpenLinkModal}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '6px', border: '1px dashed #7B5233',
                          backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: 'bold',
                          fontSize: '0.78rem', cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} />
                        <span>Thêm liên kết mới</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LINK MODAL FOR SUB-TABLE CRUD */}
            {isLinkModalOpen && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100, backdropFilter: 'blur(4px)'
              }}>
                <div style={{
                  backgroundColor: '#FFFFFF', borderRadius: '14px', width: '420px',
                  padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, color: '#2D1A12', fontSize: '0.95rem', fontWeight: 800 }}>
                      {activeTab === 'factory' ? 'Thêm liên kết Phòng ban' : 'Thêm liên kết Vị trí'}
                    </h4>
                    <button onClick={() => setIsLinkModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveLink}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#4B5563', marginBottom: '6px' }}>
                        {activeTab === 'factory' ? 'CHỌN PHÒNG BAN LIÊN KẾT' : 'CHỌN VỊ TRÍ LIÊN KẾT'}
                      </label>
                      <select
                        value={selectedOptionId}
                        onChange={(e) => setSelectedOptionId(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      >
                        <option value="">-- Chọn mục để liên kết --</option>
                        {availableOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.code ? `[${opt.code}] ` : ''}{opt.name || opt.structure_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setIsLinkModalOpen(false)}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={linkSubmitting}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#7B5233', color: '#FFF', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        {linkSubmitting ? 'Đang lưu...' : 'Lưu liên kết'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            </div>
          </>
        )}
        </div>
      </div>

      {/* DYNAMIC MODALS FOR CONFIGURATION */}
      {isModalOpen && activeTab !== 'role' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', width: '640px', maxWidth: '95vw',
            maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', border: '1px solid #E5E7EB',
            boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#FAF8F6'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#2D1A12' }}>
                {selectedItem ? (
                  activeTab === 'factory' ? 'Chỉnh sửa Cấu trúc Nhà máy / Xưởng' :
                  activeTab === 'department' ? 'Chỉnh sửa Bộ phận' :
                  activeTab === 'position' ? 'Chỉnh sửa Vị trí / Chức vụ' :
                  activeTab === 'permission' ? 'Chỉnh sửa Vị trí & Phân quyền' :
                  activeTab === 'category' ? 'Chỉnh sửa Dòng hàng' :
                  activeTab === 'defect_category' ? 'Chỉnh sửa Phân nhóm Lỗi QC' :
                  activeTab === 'stage' ? 'Chỉnh sửa Công đoạn Sản xuất' :
                  activeTab === 'customer' ? 'Chỉnh sửa Khách hàng' :
                  activeTab === 'sidebar' ? 'Chỉnh sửa Menu Sidebar' :
                  'Chỉnh sửa bản ghi cấu hình'
                ) : (
                  activeTab === 'factory' ? 'Thêm mới Cấu trúc Nhà máy / Xưởng' :
                  activeTab === 'department' ? 'Thêm mới Bộ phận' :
                  activeTab === 'position' ? 'Thêm mới Vị trí / Chức vụ' :
                  activeTab === 'permission' ? 'Thêm mới Vị trí & Phân quyền' :
                  activeTab === 'category' ? 'Thêm mới Dòng hàng' :
                  activeTab === 'defect_category' ? 'Thêm mới Phân nhóm Lỗi QC' :
                  activeTab === 'stage' ? 'Thêm mới Công đoạn Sản xuất' :
                  activeTab === 'customer' ? 'Thêm mới Khách hàng' :
                  activeTab === 'sidebar' ? 'Thêm mới Menu Sidebar' :
                  'Thêm mới cấu hình'
                )}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ padding: '24px 28px', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. FACTORY STRUCTURE MODAL FIELDS */}
                {activeTab === 'factory' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ VIẾT TẮT *</label>
                      <input
                        type="text"
                        value={factoryCode}
                        onChange={(e) => setFactoryCode(e.target.value)}
                        placeholder="Ví dụ: NM1, PX_SON, TO_RAP, KHO_GO..."
                        disabled={selectedItem !== null}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '0.85rem',
                          outline: 'none',
                          backgroundColor: selectedItem !== null ? '#F3F4F6' : '#FFFFFF',
                          color: selectedItem !== null ? '#6B7280' : '#1F2937'
                        }}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN NHÀ MÁY / PHÂN XƯỞNG / TỔ *</label>
                      <input
                        type="text"
                        value={factoryName}
                        onChange={(e) => setFactoryName(e.target.value)}
                        placeholder="Ví dụ: Nhà máy 1, Phân xưởng Sơn, Tổ Lắp ráp 2..."
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>PHÂN LOẠI CẤU TRÚC *</label>
                      <select
                        value={factoryType}
                        onChange={(e) => setFactoryType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                        required
                      >
                        <option value="Nhà máy">Nhà máy (Factory)</option>
                        <option value="Phân xưởng">Phân xưởng (Workshop)</option>
                        <option value="Tổ sản xuất">Tổ sản xuất (Section)</option>
                        <option value="Kho bãi">Kho bãi (Warehouse)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC CẤU TRÚC CẤP TRÊN (NẾU CÓ)</label>
                      <select
                        value={factoryParentId}
                        onChange={(e) => setFactoryParentId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Cấp cao nhất (Toàn nhà máy / Không trực thuộc) --</option>
                        {dataList
                          .filter(x => !selectedItem || x.id !== selectedItem.id) // Avoid self nested
                          .map(x => (
                            <option key={x.id} value={x.id}>{x.structure_name} ({x.structure_type})</option>
                          ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>DIỄN GIẢI CHI TIẾT</label>
                      <textarea
                        value={factoryDesc}
                        onChange={(e) => setFactoryDesc(e.target.value)}
                        placeholder="Mô tả chức năng, quy mô hoặc ghi chú về khu vực này..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 2. GENERAL DEPT & POSITION FIELDS */}
                {(activeTab === 'department' || activeTab === 'position') && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ VIẾT TẮT *</label>
                      <input
                        type="text"
                        value={generalCode}
                        onChange={(e) => setGeneralCode(e.target.value)}
                        placeholder={activeTab === 'department' ? 'Ví dụ: BP_QC, BP_KT, BP_SX, TO_RAP...' : 'Ví dụ: TP_QC, KCS_SON, TO_TRUONG, THU_KHO...'}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>
                        {activeTab === 'department' ? 'TÊN BỘ PHẬN *' : 'TÊN VỊ TRÍ / CHỨC VỤ *'}
                      </label>
                      <input
                        type="text"
                        value={generalName}
                        onChange={(e) => setGeneralName(e.target.value)}
                        placeholder={activeTab === 'department' ? 'Ví dụ: Bộ phận QC, Bộ phận Thiết kế, Tổ Lắp ráp...' : 'Ví dụ: Trưởng phòng QC, KCS Xưởng Sơn, Tổ trưởng Lắp ráp...'}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    {activeTab === 'department' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC PHÒNG BAN *</label>
                          <select
                            value={deptRoleId}
                            onChange={(e) => setDeptRoleId(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                            required
                          >
                            <option value="">-- Chọn Phòng Ban trực thuộc --</option>
                            {roleOptions.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>PHẠM VI TRÁCH NHIỆM CHỐT</label>
                          <textarea
                            value={deptResponsibilityScope}
                            onChange={(e) => setDeptResponsibilityScope(e.target.value)}
                            placeholder="Mô tả phạm vi trách nhiệm chốt của bộ phận..."
                            rows="3"
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                          />
                        </div>
                      </>
                    )}

                    {activeTab === 'position' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ NHIỆM VỤ & TRÁCH NHIỆM</label>
                        <textarea
                          value={generalDesc}
                          onChange={(e) => setGeneralDesc(e.target.value)}
                          placeholder="Mô tả nhiệm vụ, trách nhiệm công việc chính của vị trí..."
                          rows="3"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* 3. SIDEBAR TREE CONFIG FIELDS */}
                {activeTab === 'sidebar' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TIÊU ĐỀ MENU *</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ví dụ: Quản lý sản xuất"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC NHÓM MENU CHA</label>
                      <select
                        value={formParentId}
                        onChange={(e) => setFormParentId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Là nhóm Menu chính (Không có nhóm cha) --</option>
                        {filteredData
                          .filter(m => !selectedItem || m.id !== selectedItem.id) // Avoid self nesting
                          .map(m => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                          ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐƯỜNG DẪN / ROUTE PATH</label>
                      <input
                        type="text"
                        value={formRoutePath}
                        onChange={(e) => setFormRoutePath(e.target.value)}
                        placeholder="Ví dụ: /admin/plan"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>KHÓA PHÂN QUYỀN (PERMISSION KEY)</label>
                      <input
                        type="text"
                        value={formPermissionKey}
                        onChange={(e) => setFormPermissionKey(e.target.value)}
                        placeholder="Ví dụ: users, plan, defects"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>

                    {/* Icons Grid selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>BIỂU TƯỢNG (ICON)</label>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px',
                        maxHeight: '110px', overflowY: 'auto', border: '1px solid #E5E7EB',
                        padding: '10px', borderRadius: '8px'
                      }}>
                        {iconOptions.map(iconName => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setFormIcon(iconName)}
                            style={{
                              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: formIcon === iconName ? '2px solid #7B5233' : '1px solid #E5E7EB',
                              backgroundColor: formIcon === iconName ? '#FAF6F0' : '#FFFFFF',
                              borderRadius: '6px', cursor: 'pointer',
                              color: formIcon === iconName ? '#7B5233' : '#4B5563'
                            }}
                            title={iconName}
                          >
                            <DynamicIcon name={iconName} size={16} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(!formIsActive)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: formIsActive ? '#7B5233' : '#9CA3AF' }}
                      >
                        {formIsActive ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                        Kích hoạt hiển thị trên Sidebar
                      </span>
                    </div>
                  </>
                )}

                {/* 4. MASTER CATEGORY (DÒNG HÀNG) FIELDS */}
                {activeTab === 'category' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN DÒNG HÀNG *</label>
                      <input
                        type="text"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="Ví dụ: Tủ bếp, Bàn ăn, Ghế sofa, Giường ngủ"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>DÒNG HÀNG CHÍNH</label>
                      <select
                        value={catMainCategory}
                        onChange={(e) => setCatMainCategory(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      >
                        <option value="">-- Chọn Dòng hàng chính --</option>
                        <option value="Vanity">Vanity</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ / DIỄN GIẢI</label>
                      <textarea
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        placeholder="Nhập mô tả đặc tính hoặc quy cách của dòng hàng..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 4.1 DEFECT CATEGORY (PHÂN NHÓM LỖI QC) FIELDS */}
                {activeTab === 'defect_category' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN PHÂN NHÓM LỖI QC *</label>
                      <input
                        type="text"
                        value={defectCatName}
                        onChange={(e) => setDefectCatName(e.target.value)}
                        placeholder="Ví dụ: Ngoại quan (Visual), Sơn & Bề mặt (Paint), Kết cấu (Structure)..."
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ ĐỊNH DANH (KEY) *</label>
                        <input
                          type="text"
                          value={defectCatCode}
                          onChange={(e) => setDefectCatCode(e.target.value.toLowerCase())}
                          placeholder="Ví dụ: visual, paint, structure, material, other"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TIỀN TỐ MÃ LỖI G7 (PREFIX) *</label>
                        <input
                          type="text"
                          value={defectCatPrefix}
                          onChange={(e) => setDefectCatPrefix(e.target.value.toUpperCase())}
                          placeholder="Ví dụ: APP, PAI, STR, MAT, OTH"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THỨ TỰ ƯU TIÊN</label>
                        <input
                          type="number"
                          value={defectCatOrder}
                          onChange={(e) => setDefectCatOrder(parseInt(e.target.value) || 0)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', paddingTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={defectCatIsActive}
                            onChange={(e) => setDefectCatIsActive(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#7B5233' }}
                          />
                          <span style={{ fontWeight: 700, color: defectCatIsActive ? '#15803D' : '#6B7280' }}>
                            {defectCatIsActive ? 'Kích hoạt phân nhóm này' : 'Dừng hoạt động'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ / TIÊU CHUẨN GHI NHẬN</label>
                      <textarea
                        value={defectCatDesc}
                        onChange={(e) => setDefectCatDesc(e.target.value)}
                        placeholder="Mô tả phạm vi áp dụng hoặc tiêu chí phân loại lỗi..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 5. PRODUCTION STAGE (CÔNG ĐOẠN SX) FIELDS */}
                {activeTab === 'stage' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ CĐ (TỰ SINH)</label>
                        <input
                          type="text"
                          value={stageCode}
                          onChange={(e) => setStageCode(e.target.value)}
                          placeholder="Tự sinh (VD: CD01)"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#F9FAFB' }}
                          title="Hệ thống tự sinh mã công đoạn, bạn có thể chỉnh sửa lại nếu cần"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN CÔNG ĐOẠN *</label>
                        <input
                          type="text"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                          placeholder="Ví dụ: Tạo phôi, Định hình, Sơn lót, Lắp ráp"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THỨ TỰ (TỰ SINH)</label>
                        <input
                          type="number"
                          value={stageSequence}
                          onChange={(e) => setStageSequence(e.target.value)}
                          placeholder="Tự tăng"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#F9FAFB' }}
                          title="Thứ tự tự động bằng số lượng công đoạn hiện tại + 1"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ QUY TRÌNH</label>
                      <textarea
                        value={stageDesc}
                        onChange={(e) => setStageDesc(e.target.value)}
                        placeholder="Mô tả tiêu chuẩn kỹ thuật hoặc ghi chú công đoạn..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={stageIsActive}
                          onChange={(e) => setStageIsActive(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: '#7B5233' }}
                        />
                        <span style={{ fontWeight: 700, color: stageIsActive ? '#15803D' : '#6B7280' }}>
                          {stageIsActive ? 'Kích hoạt công đoạn này' : 'Tạm dừng hoạt động'}
                        </span>
                      </label>
                    </div>
                  </>
                )}

                {/* 6. CUSTOMER (KHÁCH HÀNG / ĐỐI TÁC) FIELDS */}
                {activeTab === 'customer' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ KH *</label>
                        <input
                          type="text"
                          value={custCode}
                          onChange={(e) => setCustCode(e.target.value)}
                          placeholder="KH001"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN DOANH NGHIỆP / KHÁCH HÀNG *</label>
                        <input
                          type="text"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Ví dụ: Công ty TNHH Nội Thất Minh Long"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>NGƯỜI ĐẠI DIỆN LIÊN HỆ</label>
                        <input
                          type="text"
                          value={custContact}
                          onChange={(e) => setCustContact(e.target.value)}
                          placeholder="Họ tên người liên hệ"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>SỐ ĐIỆN THOẠI</label>
                        <input
                          type="text"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="0912 345 678"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>EMAIL</label>
                        <input
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="contact@customer.com"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ SỐ THUẾ (MST)</label>
                        <input
                          type="text"
                          value={custTax}
                          onChange={(e) => setCustTax(e.target.value)}
                          placeholder="0102030405"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐỊA CHỈ TRỤ SỞ</label>
                        <input
                          type="text"
                          value={custAddress}
                          onChange={(e) => setCustAddress(e.target.value)}
                          placeholder="Địa chỉ công ty/chi nhánh..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>QUỐC GIA</label>
                        <input
                          type="text"
                          value={custCountry}
                          onChange={(e) => setCustCountry(e.target.value)}
                          placeholder="Vietnam"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>GHI CHÚ THÊM</label>
                      <textarea
                        value={custNotes}
                        onChange={(e) => setCustNotes(e.target.value)}
                        placeholder="Ghi chú về chính sách thanh toán, điều khoản hợp tác..."
                        rows="2"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

                {/* 7. PERMISSION (VỊ TRÍ / CHỨC VỤ) FIELDS */}
                {activeTab === 'permission' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC PHÒNG BAN</label>
                        <select
                          value={permRoleId}
                          onChange={(e) => {
                            const newRoleId = e.target.value;
                            setPermRoleId(newRoleId);
                            // If selected department does not belong to new role, reset dept
                            if (permDeptId) {
                              const dept = deptOptions.find(d => String(d.id) === String(permDeptId));
                              if (dept && newRoleId && String(dept.role_id) !== String(newRoleId)) {
                                setPermDeptId('');
                              }
                            }
                          }}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                        >
                          <option value="">-- Tất cả phòng ban / Dùng chung --</option>
                          {roleOptions.map(r => (
                            <option key={r.id} value={r.id}>{r.name || r.description}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THUỘC BỘ PHẬN</label>
                        <select
                          value={permDeptId}
                          onChange={(e) => {
                            const newDeptId = e.target.value;
                            setPermDeptId(newDeptId);
                            if (newDeptId) {
                              const dept = deptOptions.find(d => String(d.id) === String(newDeptId));
                              if (dept && dept.role_id) {
                                setPermRoleId(String(dept.role_id));
                              }
                            }
                          }}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                        >
                          <option value="">-- Tất cả bộ phận / Dùng chung --</option>
                          {deptOptions
                            .filter(d => !permRoleId || String(d.role_id) === String(permRoleId))
                            .map(d => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.code} {d.code && d.name && d.code !== d.name ? `(${d.code})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN VỊ TRÍ / CHỨC VỤ *</label>
                      <input
                        type="text"
                        value={permName}
                        onChange={(e) => setPermName(e.target.value)}
                        placeholder="Ví dụ: KCS Xưởng Sơn, Trưởng phòng QC, Tổ trưởng Lắp ráp, Thủ kho..."
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ NHIỆM VỤ & TRÁCH NHIỆM</label>
                      <textarea
                        value={permDesc}
                        onChange={(e) => setPermDesc(e.target.value)}
                        placeholder="Mô tả phạm vi quyền hạn, trách nhiệm và công việc chính..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TRẠNG THÁI HOẠT ĐỘNG</label>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="permStatusRadio"
                            checked={permIsActive === true}
                            onChange={() => setPermIsActive(true)}
                          />
                          <span style={{ color: '#059669', fontWeight: 700 }}>● Kích hoạt</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="permStatusRadio"
                            checked={permIsActive === false}
                            onChange={() => setPermIsActive(false)}
                          />
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>● Tạm khóa</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* 9. INSPECTION FORM TYPE (LOẠI PHIẾU KIỂM TRA) FIELDS */}
                {activeTab === 'inspection_form_type' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ ĐỊNH DANH (CODE) *</label>
                        <input
                          type="text"
                          value={formTypeCode}
                          onChange={(e) => setFormTypeCode(e.target.value.toLowerCase())}
                          disabled={selectedItem && selectedItem.is_system}
                          placeholder="Ví dụ: patrol, special_qc"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'monospace',
                            backgroundColor: (selectedItem && selectedItem.is_system) ? '#F3F4F6' : '#FFFFFF'
                          }}
                          required
                        />
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                          {(selectedItem && selectedItem.is_system) ? 'Mã hệ thống gốc cố định' : 'Mã viết thường không dấu'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN LOẠI PHIẾU HIỂN THỊ *</label>
                        <input
                          type="text"
                          value={formTypeName}
                          onChange={(e) => setFormTypeName(e.target.value)}
                          placeholder="Ví dụ: Kiểm tra mẫu lần đầu, Kiểm tra quy trình..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN RÚT GỌN (BADGE NHÃN)</label>
                        <input
                          type="text"
                          value={formTypeShortName}
                          onChange={(e) => setFormTypeShortName(e.target.value)}
                          placeholder="Ví dụ: Mẫu lần đầu, Quy trình"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐƯỜNG DẪN ROUTE MOBILE</label>
                        <input
                          type="text"
                          value={formTypeRoute}
                          onChange={(e) => setFormTypeRoute(e.target.value)}
                          placeholder="/production_v2/inspection/..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÀU SẮC NHẬN DIỆN</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="color"
                            value={formTypeColor}
                            onChange={(e) => setFormTypeColor(e.target.value)}
                            style={{ width: '36px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            value={formTypeColor}
                            onChange={(e) => setFormTypeColor(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', width: '100px', outline: 'none', fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THỨ TỰ HIỂN THỊ</label>
                        <input
                          type="number"
                          value={formTypeOrder}
                          onChange={(e) => setFormTypeOrder(parseInt(e.target.value) || 0)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ MỤC ĐÍCH SỬ DỤNG</label>
                      <textarea
                        value={formTypeDesc}
                        onChange={(e) => setFormTypeDesc(e.target.value)}
                        placeholder="Mô tả phạm vi áp dụng của loại phiếu này..."
                        rows="2"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TRẠNG THÁI HOẠT ĐỘNG</label>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="formTypeStatusRadio"
                            checked={formTypeIsActive === true}
                            onChange={() => setFormTypeIsActive(true)}
                          />
                          <span style={{ color: '#059669', fontWeight: 700 }}>● Kích hoạt (Hiển thị trên Mobile & Web)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="formTypeStatusRadio"
                            checked={formTypeIsActive === false}
                            onChange={() => setFormTypeIsActive(false)}
                          />
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>● Tạm ẩn</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* 10. INSPECTION PARAMETER (THÔNG SỐ ĐO KIỂM TRA) FIELDS */}
                {activeTab === 'inspection_parameter' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ THÔNG SỐ (CODE) *</label>
                        <input
                          type="text"
                          value={paramCode}
                          onChange={(e) => setParamCode(e.target.value.toLowerCase())}
                          placeholder="Ví dụ: do_am, nhiet_do, anh_sang"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN THÔNG SỐ ĐO *</label>
                        <input
                          type="text"
                          value={paramName}
                          onChange={(e) => setParamName(e.target.value)}
                          placeholder="Ví dụ: Độ ẩm, Nhiệt độ sấy, Cường độ ánh sáng..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐƠN VỊ ĐO</label>
                        <input
                          type="text"
                          value={paramUnit}
                          onChange={(e) => setParamUnit(e.target.value)}
                          placeholder="Ví dụ: %, °C, Lux, GU, mm"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>CHUẨN TỐI THIỂU (MIN)</label>
                        <input
                          type="number"
                          step="any"
                          value={paramMin}
                          onChange={(e) => setParamMin(e.target.value)}
                          placeholder="Min (VD: 6)"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>CHUẨN TỐI ĐA (MAX)</label>
                        <input
                          type="number"
                          step="any"
                          value={paramMax}
                          onChange={(e) => setParamMax(e.target.value)}
                          placeholder="Max (VD: 14)"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>THỨ TỰ HIỂN THỊ</label>
                        <input
                          type="number"
                          value={paramOrder}
                          onChange={(e) => setParamOrder(parseInt(e.target.value) || 0)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TRẠNG THÁI HOẠT ĐỘNG</label>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="radio"
                              name="paramStatusRadio"
                              checked={paramIsActive === true}
                              onChange={() => setParamIsActive(true)}
                            />
                            <span style={{ color: '#059669', fontWeight: 700 }}>● Kích hoạt</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="radio"
                              name="paramStatusRadio"
                              checked={paramIsActive === false}
                              onChange={() => setParamIsActive(false)}
                            />
                            <span style={{ color: '#DC2626', fontWeight: 700 }}>● Tạm ẩn</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ISO DOCUMENT TYPE (LOẠI HỒ SƠ ISO) FIELDS */}
                {activeTab === 'iso_document_type' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ VIẾT TẮT *</label>
                        <input
                          type="text"
                          value={isoDocTypeCode}
                          onChange={(e) => setIsoDocTypeCode(e.target.value.toUpperCase())}
                          placeholder="VD: QT, HD, CS, BM, QD, TL..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', fontWeight: 700 }}
                          required
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN LOẠI HỒ SƠ *</label>
                        <input
                          type="text"
                          value={isoDocTypeName}
                          onChange={(e) => setIsoDocTypeName(e.target.value)}
                          placeholder="VD: Quy trình, Hướng dẫn, Chính sách, Biểu mẫu..."
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÔ TẢ / DIỄN GIẢI</label>
                      <textarea
                        value={isoDocTypeDesc}
                        onChange={(e) => setIsoDocTypeDesc(e.target.value)}
                        placeholder="Mô tả đặc tính, mục đích hoặc hướng dẫn sử dụng loại hồ sơ này..."
                        rows="3"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: '20px', display: 'flex', justifyContent: 'flex-end',
                gap: '10px', borderTop: '1px solid #F3F4F6', paddingTop: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF', color: '#4B5563', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '0.8rem'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#7B5233', color: '#FFFFFF', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Save size={14} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* SPECIAL SHIELD MODAL FOR BỘ PHẬN (ROLES) */}
      {isModalOpen && activeTab === 'role' && (
        <DepartmentModal
          isOpen={isModalOpen}
          modalMode={selectedItem ? 'edit' : 'create'}
          selectedDepartment={selectedItem}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={handleRoleConfirm}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteModalOpen && deletingItem && (
        <BeautifulConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa cấu hình"
          message={`Bạn có chắc chắn muốn xóa bản ghi "${deletingItem.structure_name || deletingItem.name}"? Cảnh báo: Việc xóa bỏ có thể ảnh hưởng đến liên kết nhân sự hoặc quyền hạn liên quan.`}
          confirmText="Đồng ý xóa"
          cancelText="Hủy bỏ"
          type="danger"
        />
      )}

    </div>
  );
}
