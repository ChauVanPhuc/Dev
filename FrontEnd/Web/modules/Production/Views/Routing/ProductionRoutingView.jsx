import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, ArrowUpDown, Filter, Plus, Copy, MoreHorizontal, Upload, Download,
  ArrowRight, ArrowLeft, Trash2, CheckCircle2, Layers, Building2, Wrench, Settings,
  Grid, PlusCircle, Check, X, ShieldAlert, Sparkles, RefreshCw, Calendar, Edit3, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import api from '@webShared/Services/api.service';

/**
 * View: Cấu hình Quy trình sản xuất (/admin/production-routing)
 * Match 100% Ảnh 1 (Kho Tổ theo Tab 3), Ảnh 2 & Ảnh 3 (Bảng Kế Hoạch Thực Hiện 15 Cột)
 */
const ProductionRoutingView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;
  const { toast } = useToast();

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-routing');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quy trình - kế hoạch');
    if (setCustomSubtitle) setCustomSubtitle('SX04: Quy trình sản xuất');
    if (setCustomScreenCode) setCustomScreenCode('SX04');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [activeTab, setActiveTab] = useState('routing');
  const [searchTerm, setSearchTerm] = useState('');

  const [routingsList, setRoutingsList] = useState([
    {
      id: 'QT-TU-01',
      code: 'QT-TU-01',
      name: 'Quy trình sản xuất Tủ áo & Tủ trang trí',
      category: 'Tủ gỗ',
      isDefault: true,
      appliedCount: 12,
      nodes: []
    },
    {
      id: 'QT-BAN-01',
      code: 'QT-BAN-01',
      name: 'Quy trình sản xuất Bàn ăn & Bàn làm việc',
      category: 'Bàn gỗ',
      isDefault: false,
      appliedCount: 8,
      nodes: []
    },
    {
      id: 'QT-GIUONG-01',
      code: 'QT-GIUONG-01',
      name: 'Quy trình sản xuất Giường ngủ King & Queen Size',
      category: 'Giường gỗ',
      isDefault: false,
      appliedCount: 5,
      nodes: []
    }
  ]);

  const [selectedRoutingId, setSelectedRoutingId] = useState('QT-TU-01');
  const [activeNodeId, setActiveNodeId] = useState(1);

  const currentRouting = useMemo(() => {
    return routingsList.find(r => r.id === selectedRoutingId) || routingsList[0] || {
      id: 'QT-TU-01',
      code: 'QT-TU-01',
      name: 'Quy trình sản xuất Tủ áo & Tủ trang trí',
      category: 'Tủ gỗ',
      isDefault: true,
      appliedCount: 12,
      nodes: []
    };
  }, [routingsList, selectedRoutingId]);

  const [teamsList, setTeamsList] = useState([]);
  const [routingTeamsMap, setRoutingTeamsMap] = useState({});

  const defaultProducts = useMemo(() => [
    { id: 1, code: 'SP-TU-001', name: 'Tủ áo gỗ sồi 4 cánh âm tường', routingCode: 'QT-TU-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 2, code: 'SP-TU-002', name: 'Tủ áo gỗ gõ đỏ 3 cánh cổ điển', routingCode: 'QT-TU-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 3, code: 'SP-TU-003', name: 'Tủ trang trí phòng khách gỗ xoan đào', routingCode: 'QT-TU-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 4, code: 'SP-TU-004', name: 'Tủ rượu cánh kính đèn LED cao cấp', routingCode: 'QT-TU-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 5, code: 'SP-TU-005', name: 'Tủ quần áo âm tường thông minh', routingCode: 'QT-TU-01', applyDate: '05/08/2026', status: 'Đang áp dụng' },
    { id: 6, code: 'SP-TU-006', name: 'Tủ chè khảm trai truyền thống', routingCode: 'QT-TU-01', applyDate: '06/08/2026', status: 'Đang áp dụng' },
    { id: 7, code: 'SP-TU-007', name: 'Tủ sách gỗ óc chó 5 tầng', routingCode: 'QT-TU-01', applyDate: '07/08/2026', status: 'Đang áp dụng' },
    { id: 8, code: 'SP-TU-008', name: 'Tủ giày dép gỗ cao su xuất khẩu', routingCode: 'QT-TU-01', applyDate: '08/08/2026', status: 'Đang áp dụng' },
    { id: 9, code: 'SP-TU-009', name: 'Tủ đựng đồ sơ sinh gỗ công nghiệp MDF', routingCode: 'QT-TU-01', applyDate: '09/08/2026', status: 'Đang áp dụng' },
    { id: 10, code: 'SP-TU-010', name: 'Tủ bếp trên dưới gỗ tần bì', routingCode: 'QT-TU-01', applyDate: '10/08/2026', status: 'Đang áp dụng' },
    { id: 11, code: 'SP-TU-011', name: 'Tủ lavabo phòng tắm chống nước', routingCode: 'QT-TU-01', applyDate: '11/08/2026', status: 'Đang áp dụng' },
    { id: 12, code: 'SP-TU-012', name: 'Tủ trưng bày sản phẩm showroom', routingCode: 'QT-TU-01', applyDate: '12/08/2026', status: 'Đang áp dụng' },

    { id: 13, code: 'SP-BAN-001', name: 'Bàn ăn gỗ sồi 6 ghế tròn', routingCode: 'QT-BAN-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 14, code: 'SP-BAN-002', name: 'Bàn làm việc giám đốc gỗ gõ đỏ', routingCode: 'QT-BAN-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 15, code: 'SP-BAN-003', name: 'Bàn trà phòng khách chân sắt sơn tĩnh điện', routingCode: 'QT-BAN-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 16, code: 'SP-BAN-004', name: 'Bàn trang điểm kèm gương LED cảm ứng', routingCode: 'QT-BAN-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 17, code: 'SP-BAN-005', name: 'Bàn họp hội trường 12 chỗ gỗ công nghiệp', routingCode: 'QT-BAN-01', applyDate: '05/08/2026', status: 'Đang áp dụng' },
    { id: 18, code: 'SP-BAN-006', name: 'Bàn học sinh gấp gọn thông minh', routingCode: 'QT-BAN-01', applyDate: '06/08/2026', status: 'Đang áp dụng' },
    { id: 19, code: 'SP-BAN-007', name: 'Bàn bar chân cao nhà bếp tân cổ điển', routingCode: 'QT-BAN-01', applyDate: '07/08/2026', status: 'Đang áp dụng' },
    { id: 20, code: 'SP-BAN-008', name: 'Bàn sofa mặt đá nhân tạo cao cấp', routingCode: 'QT-BAN-01', applyDate: '08/08/2026', status: 'Đang áp dụng' },

    { id: 21, code: 'SP-GIUONG-001', name: 'Giường ngủ gỗ gõ đỏ 1m8x2m hoàng gia', routingCode: 'QT-GIUONG-01', applyDate: '01/08/2026', status: 'Đang áp dụng' },
    { id: 22, code: 'SP-GIUONG-002', name: 'Giường ngủ bọc nệm đầu giường 1m6x2m', routingCode: 'QT-GIUONG-01', applyDate: '02/08/2026', status: 'Đang áp dụng' },
    { id: 23, code: 'SP-GIUONG-003', name: 'Giường tầng trẻ em đa năng kèm cầu trượt', routingCode: 'QT-GIUONG-01', applyDate: '03/08/2026', status: 'Đang áp dụng' },
    { id: 24, code: 'SP-GIUONG-004', name: 'Giường gấp thông minh có ngăn kéo âm', routingCode: 'QT-GIUONG-01', applyDate: '04/08/2026', status: 'Đang áp dụng' },
    { id: 25, code: 'SP-GIUONG-005', name: 'Giường bệt kiểu Nhật gỗ sồi bọc vải', routingCode: 'QT-GIUONG-01', applyDate: '05/08/2026', status: 'Đang áp dụng' }
  ], []);

  const extractDòngHàngKey = (category, code, name) => {
    const text = `${category || ''} ${code || ''} ${name || ''}`.toUpperCase();
    const seriesList = ['APT', 'ATL', 'FOL', 'ADV', 'TPH', 'HOR', 'EYC', 'COV', 'TIN', 'BEZ', 'MBC', 'TU', 'BAN', 'GIUONG'];
    for (const s of seriesList) {
      if (text.includes(s)) return s;
    }
    if (category) {
      const cleaned = category.replace(/Dòng hàng/gi, '').trim();
      if (cleaned) return cleaned;
    }
    return '';
  };

  const [appliedProducts, setAppliedProducts] = useState(defaultProducts);

  const currentAppliedProducts = useMemo(() => {
    const rCode = selectedRoutingId || currentRouting?.code || 'QT-TU-01';
    const seriesKey = extractDòngHàngKey(currentRouting?.category, currentRouting?.code, currentRouting?.name);

    if (seriesKey) {
      const sKeyUpper = seriesKey.toUpperCase();
      const matched = appliedProducts.filter(p => {
        const codeUpper = (p.code || '').toUpperCase();
        const catUpper = (p.category || '').toUpperCase();
        const rCodeUpper = (p.routingCode || '').toUpperCase();
        return codeUpper.includes(sKeyUpper) || catUpper.includes(sKeyUpper) || rCodeUpper.includes(sKeyUpper);
      });
      if (matched.length > 0) return matched;
    }

    return appliedProducts.filter(p => p.routingCode === rCode);
  }, [appliedProducts, selectedRoutingId, currentRouting]);

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productPage, setProductPage] = useState(0);
  const [productRowsPerPage, setProductRowsPerPage] = useState(15);

  useEffect(() => {
    setProductPage(0);
  }, [selectedRoutingId, productSearchTerm]);

  const filteredAppliedProducts = useMemo(() => {
    let list = currentAppliedProducts;
    if (productSearchTerm.trim()) {
      const term = productSearchTerm.trim().toLowerCase();
      list = list.filter(
        p => (p.code || '').toLowerCase().includes(term) || (p.name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [currentAppliedProducts, productSearchTerm]);

  const totalProductPages = useMemo(() => {
    return Math.ceil(filteredAppliedProducts.length / productRowsPerPage) || 1;
  }, [filteredAppliedProducts.length, productRowsPerPage]);

  const paginatedAppliedProducts = useMemo(() => {
    const start = productPage * productRowsPerPage;
    return filteredAppliedProducts.slice(start, start + productRowsPerPage);
  }, [filteredAppliedProducts, productPage, productRowsPerPage]);

  const [isBackendLoaded, setIsBackendLoaded] = useState(false);

  const currentRoutingTeams = useMemo(() => {
    return routingTeamsMap[selectedRoutingId] || [];
  }, [routingTeamsMap, selectedRoutingId]);

  const currentFactoryTeamsGrouped = useMemo(() => {
    const map = {};
    currentRoutingTeams.forEach(t => {
      const fac = t.factory || 'Nhà máy 1';
      if (!map[fac]) {
        map[fac] = {
          factory: fac,
          color: fac === 'Nhà máy 1' ? '#2D1A12' : fac === 'Nhà máy 2' ? '#D97706' : '#3B82F6',
          teams: []
        };
      }
      map[fac].teams.push(t);
    });
    return Object.values(map);
  }, [currentRoutingTeams]);

  const validPipelineNodes = useMemo(() => {
    if (!currentRouting || !currentRouting.nodes) return currentRoutingTeams;
    if (['QT-TU-01', 'QT-BAN-01', 'QT-GIUONG-01'].includes(selectedRoutingId) && currentRouting.nodes.length === 0) {
      return currentRoutingTeams;
    }
    return currentRouting.nodes;
  }, [currentRouting, currentRoutingTeams, selectedRoutingId]);

  const [allExecutionPlanRows, setAllExecutionPlanRows] = useState([]);

  const [showAddRoutingModal, setShowAddRoutingModal] = useState(false);
  const [newRoutingForm, setNewRoutingForm] = useState({
    code: '',
    name: '',
    category: 'Dòng hàng APT',
    desc: ''
  });

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận xóa',
    onConfirm: null
  });

  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamForm, setNewTeamForm] = useState({
    factory: 'Nhà máy 1',
    teamCode: 'TO-NM1-501',
    teamName: '',
    members: 10,
    desc: ''
  });

  const factoryStagesMap = useMemo(() => ({
    'Nhà máy 1': [
      'Tổ tạo phôi',
      'Tổ định hình 1',
      'Tổ định hình 2',
      'Tổ lắp ráp 1',
      'Tổ sấy gỗ & kho nguyên liệu'
    ],
    'Nhà máy 2': [
      'Tổ định hình 3',
      'Tổ định hình 4',
      'Tổ dán nẹp & phay CNC',
      'Tổ sơn PU 1',
      'Tổ sơn PU 2'
    ],
    'Nhà máy 3': [
      'Tổ QC kiểm định',
      'Đóng gói 1',
      'Đóng gói 2',
      'Tổ bọc màng PE & xếp pallet'
    ],
    'Nhà máy 4': [
      'Tổ phụ kiện kim loại',
      'Tổ gia công kim loại & hàn khung',
      'Tổ sơn mạ & xử lý kim loại'
    ]
  }), []);

  const availableStagesForFactory = useMemo(() => {
    const fac = (newTeamForm && newTeamForm.factory) ? newTeamForm.factory : 'Nhà máy 1';
    const dbTeams = (teamsList || [])
      .filter(t => t.factory === fac)
      .map(t => t.teamName);
    const presetStages = factoryStagesMap[fac] || factoryStagesMap['Nhà máy 1'];
    return Array.from(new Set([...presetStages, ...dbTeams]));
  }, [newTeamForm?.factory, factoryStagesMap, teamsList]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, routingsRes] = await Promise.all([
          api.get('/production/teams'),
          api.get('/production/routings')
        ]);
        const productsRes = [];
        const stagesRes = [];

        const rawTeams = Array.isArray(teamsRes) ? teamsRes : (teamsRes && teamsRes.data) ? teamsRes.data : [];
        const rawRoutings = Array.isArray(routingsRes) ? routingsRes : (routingsRes && routingsRes.data) ? routingsRes.data : [];
        const rawProducts = Array.isArray(productsRes) ? productsRes : (productsRes && productsRes.data) ? productsRes.data : [];
        const rawStages = Array.isArray(stagesRes) ? stagesRes : (stagesRes && stagesRes.data) ? stagesRes.data : [];

        if (Array.isArray(rawStages) && rawStages.length > 0) {
          const names = rawStages.map(s => s.stage_name || s.name || s.code).filter(Boolean);
          if (names.length > 0) {
            setBomStages(prev => Array.from(new Set([...prev, ...names])));
          }
        }

        let loadedTeams = [];
        if (Array.isArray(rawTeams) && rawTeams.length > 0) {
          loadedTeams = rawTeams.map(t => ({
            id: t.id,
            teamCode: t.team_code,
            teamName: t.team_name,
            factory: t.factory,
            members: t.members_count || 10,
            desc: t.description || '',
            color: t.color || (t.factory === 'Nhà máy 1' ? '#2D1A12' : t.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6')
          }));

          setTeamsList(loadedTeams);
        }

        let parsedRoutings = [];
        if (Array.isArray(rawRoutings) && rawRoutings.length > 0) {
          const newTeamsMap = {};
          parsedRoutings = rawRoutings.map(r => {
            const dbNodes = (r.nodes || []).map(n => ({
              id: n.id || n.team_id,
              teamCode: n.team_code,
              teamName: n.team_name,
              factory: n.factory,
              members: 10,
              desc: `Tổ phụ trách công đoạn ${n.team_name}`,
              color: n.color || (n.factory === 'Nhà máy 1' ? '#2D1A12' : n.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6')
            }));

            const isPreset = ['QT-TU-01', 'QT-BAN-01', 'QT-GIUONG-01'].includes(r.routing_code);
            const effectiveNodes = dbNodes.length > 0 ? dbNodes : (isPreset ? loadedTeams : []);
            newTeamsMap[r.routing_code] = effectiveNodes;

            return {
              id: r.routing_code,
              numericId: r.id,
              code: r.routing_code,
              name: r.routing_name,
              category: r.category || '',
              isDefault: r.is_default,
              appliedCount: r.applied_count || 0,
              nodes: effectiveNodes
            };
          });

          setRoutingTeamsMap(newTeamsMap);
          setRoutingsList(parsedRoutings);
          if (parsedRoutings.length > 0 && !parsedRoutings.some(r => r.id === selectedRoutingId || r.code === selectedRoutingId)) {
            setSelectedRoutingId(parsedRoutings[0].id || parsedRoutings[0].code);
          }
        }

        const curR = (parsedRoutings && parsedRoutings.length > 0)
          ? (parsedRoutings.find(r => r.id === selectedRoutingId || r.code === selectedRoutingId) || parsedRoutings[0])
          : currentRouting;

        const seriesKey = extractDòngHàngKey(curR?.category, curR?.code, curR?.name);

        if (seriesKey) {
          try {
            const mpRes = await api.get(`/master-products/?q=${seriesKey}&limit=5000`);
            const mpData = (mpRes && mpRes.items) ? mpRes.items : (Array.isArray(mpRes) ? mpRes : []);
            if (Array.isArray(mpData) && mpData.length > 0) {
              const masterProds = mpData.map((item, idx) => ({
                id: item.id || idx + 1,
                code: item.sku,
                name: item.name || item.sku,
                applyDate: item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '01/08/2026',
                routingCode: curR?.code || selectedRoutingId,
                category: curR?.category || seriesKey,
                status: 'Đang áp dụng'
              }));
              setAppliedProducts(prev => {
                const otherProds = prev.filter(p => !p.code.toUpperCase().includes(seriesKey.toUpperCase()));
                return [...otherProds, ...masterProds];
              });
            }
          } catch (e) {
            console.warn('Lỗi fetch master products cho Dòng hàng:', e);
          }
        }
      } catch (err) {
        console.warn('Lỗi fetch dữ liệu backend:', err);
      }
    };
    fetchData();
  }, [selectedRoutingId]);

  const activeNodeObj = useMemo(() => {
    return validPipelineNodes.find(n => n.id === activeNodeId) || validPipelineNodes[0] || null;
  }, [validPipelineNodes, activeNodeId]);

  const filteredExecutionPlanRows = useMemo(() => {
    if (validPipelineNodes.length === 0) return [];

    let rows = allExecutionPlanRows.filter(
      r => r.routingId === currentRouting.id && (!activeNodeObj || r.teamCode === activeNodeObj.teamCode)
    );

    const validTeamCodes = new Set(validPipelineNodes.map(n => n.teamCode));
    rows = rows.filter(r => validTeamCodes.has(r.teamCode));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        r => r.partName.toLowerCase().includes(term) ||
             r.partSku.toLowerCase().includes(term) ||
             r.partType.toLowerCase().includes(term) ||
             r.material.toLowerCase().includes(term)
      );
    }
    return rows;
  }, [allExecutionPlanRows, currentRouting.id, activeNodeObj, searchTerm, validPipelineNodes]);

  const handleAddTeamToPipeline = (team) => {
    const isExist = currentRouting.nodes.some(n => n.teamCode === team.teamCode);
    if (isExist) {
      if (toast) toast('warning', `Tổ ${team.teamName} đã có trên chuỗi quy trình này!`);
      return;
    }

    const newNode = {
      id: Date.now(),
      teamCode: team.teamCode,
      teamName: team.teamName,
      factory: team.factory,
      color: team.factory === 'Nhà máy 1' ? '#2D1A12' : team.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
    };

    const updatedRoutings = routingsList.map(r => {
      if (r.id === currentRouting.id) {
        return { ...r, nodes: [...r.nodes, newNode] };
      }
      return r;
    });

    setRoutingsList(updatedRoutings);
    setActiveNodeId(newNode.id);
    if (toast) toast('success', `Đã thêm ${team.teamName} vào chuỗi luồng!`);
  };

  const handleMoveNode = (nodeId, direction) => {
    const nodes = [...currentRouting.nodes];
    const index = nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nodes.length) return;

    const temp = nodes[index];
    nodes[index] = nodes[targetIndex];
    nodes[targetIndex] = temp;

    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes } : r));
  };

  const handleRemoveNode = (nodeId) => {
    if (currentRouting.nodes.length <= 1) {
      if (toast) toast('warning', 'Quy trình phải có ít nhất 1 tổ sản xuất!');
      return;
    }
    const updatedNodes = currentRouting.nodes.filter(n => n.id !== nodeId);
    setRoutingsList(routingsList.map(r => r.id === currentRouting.id ? { ...r, nodes: updatedNodes } : r));
    if (activeNodeId === nodeId) setActiveNodeId(updatedNodes[0].id);
  };

  const handleCopyRouting = async () => {
    const newCode = `QT-COPY-${Date.now().toString().slice(-4)}`;
    try {
      if (currentRouting.numericId) {
        await api.post(`/production/routings/${currentRouting.numericId}/duplicate`);
      }
    } catch (e) {
      console.warn('Sao chép local state:', e);
    }
    const newRouting = {
      ...currentRouting,
      id: newCode,
      code: newCode,
      name: `${currentRouting.name} (Bản sao)`,
      isDefault: false,
      appliedCount: 0,
      nodes: currentRouting.nodes.map(n => ({ ...n, id: Date.now() + Math.random() }))
    };
    setRoutingsList([...routingsList, newRouting]);
    setSelectedRoutingId(newCode);
    if (toast) toast('success', `Đã sao chép thành công Quy trình ${newCode}!`);
  };

  const handleOpenAddTeamModal = () => {
    const code = `TO-NM1-${Math.floor(100 + Math.random() * 900)}`;
    const defaultFac = 'Nhà máy 1';
    const firstStage = (factoryStagesMap[defaultFac] || [])[0] || 'Tổ định hình 1';
    setNewTeamForm({
      factory: defaultFac,
      teamCode: code,
      teamName: firstStage,
      members: 10,
      desc: `Tổ phụ trách công đoạn ${firstStage}`
    });
    setShowAddTeamModal(true);
  };

  const handleCreateNewTeam = async (e) => {
    e.preventDefault();
    if (!newTeamForm.teamName) {
      if (toast) toast('warning', 'Vui lòng nhập Tên tổ sản xuất!');
      return;
    }
    const tCode = newTeamForm.teamCode || `TO-NM1-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      team_code: tCode,
      team_name: newTeamForm.teamName,
      factory: newTeamForm.factory || 'Nhà máy 1',
      members_count: Number(newTeamForm.members) || 10,
      description: newTeamForm.desc || 'Tổ sản xuất mới',
      color: newTeamForm.factory === 'Nhà máy 1' ? '#2D1A12' : newTeamForm.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
    };

    try {
      const res = await api.post('/production/teams', payload);
      const created = (res && res.id) ? res : (res && res.data ? res.data : (res || {}));
      const newTeamObj = {
        id: created.id || Date.now(),
        teamCode: created.team_code || tCode,
        teamName: created.team_name || newTeamForm.teamName,
        factory: created.factory || newTeamForm.factory,
        members: created.members_count || 10,
        desc: created.description || ''
      };

      // Gọi API thêm tổ vào quy trình (tạo routing_node trong CSDL)
      const routingKey = (currentRouting && currentRouting.id) || selectedRoutingId || 'QT-TU-01';
      const rObj = routingsList.find(r => r.id === routingKey || r.code === routingKey);
      const targetRoutingId = (rObj && rObj.numericId) ? rObj.numericId : routingKey;
      try {
        await api.post(`/production/routings/${targetRoutingId}/nodes`, { team_id: newTeamObj.id });
      } catch (nodeErr) {
        console.warn('Lỗi tạo routing node:', nodeErr);
      }

      const currentList = currentRoutingTeams || [];
      const updatedTeamsList = [...currentList, newTeamObj];
      setRoutingTeamsMap(prev => ({
        ...prev,
        [routingKey]: updatedTeamsList
      }));
      setTeamsList(prev => [...(prev || []), newTeamObj]);

      setRoutingsList(prevRoutings => prevRoutings.map(r => {
        if (r.id === routingKey) {
          const exists = (r.nodes || []).some(n => n.teamCode === newTeamObj.teamCode);
          if (!exists) {
            return {
              ...r,
              nodes: [...(r.nodes || []), {
                id: newTeamObj.id,
                teamCode: newTeamObj.teamCode,
                teamName: newTeamObj.teamName,
                factory: newTeamObj.factory,
                color: newTeamObj.factory === 'Nhà máy 1' ? '#2D1A12' : newTeamObj.factory === 'Nhà máy 2' ? '#D97706' : '#3B82F6'
              }]
            };
          }
        }
        return r;
      }));

      setShowAddTeamModal(false);
      setNewTeamForm({ factory: 'Nhà máy 1', teamCode: '', teamName: '', members: 10, desc: '' });
      if (toast) toast('success', `Đã lưu CSDL thành công Tổ ${newTeamForm.teamName} (${tCode})!`);
    } catch (err) {
      console.error('Lỗi khi lưu Tổ vào CSDL:', err);
      const fallbackObj = {
        id: Date.now(),
        teamCode: tCode,
        teamName: newTeamForm.teamName,
        factory: newTeamForm.factory,
        members: Number(newTeamForm.members) || 10,
        desc: newTeamForm.desc || 'Tổ sản xuất mới'
      };
      const routingKey = (currentRouting && currentRouting.id) || selectedRoutingId || 'QT-TU-01';
      const currentList = currentRoutingTeams || [];
      setRoutingTeamsMap(prev => ({
        ...prev,
        [routingKey]: [...currentList, fallbackObj]
      }));
      setShowAddTeamModal(false);
      const msg = err?.response?.data?.detail || err?.message || 'Lỗi server khi lưu';
      if (toast) toast('warning', `Lỗi kết nối CSDL: ${msg}`);
    }
  };

  const handleOpenAddRoutingModal = () => {
    const num = Math.floor(10 + Math.random() * 90);
    setNewRoutingForm({
      code: `QT-APT-${num}`,
      name: `Quy trình sản xuất Dòng hàng APT ${num}`,
      category: 'Dòng hàng APT',
      desc: 'Mô tả chi tiết quy trình sản xuất mới'
    });
    setShowAddRoutingModal(true);
  };

  const handleCreateNewRouting = async (e) => {
    e.preventDefault();
    if (!newRoutingForm.name || !newRoutingForm.code) {
      if (toast) toast('warning', 'Vui lòng nhập Mã và Tên quy trình!');
      return;
    }

    const payload = {
      routing_code: newRoutingForm.code,
      routing_name: newRoutingForm.name,
      category: newRoutingForm.category || 'Tủ gỗ',
      description: newRoutingForm.desc || '',
      is_default: false,
      applied_count: 0
    };

    try {
      const res = await api.post('/production/routings', payload);
      const rawRes = Array.isArray(res) ? res : (res && res.data) ? res.data : [];
      if (Array.isArray(rawRes) && rawRes.length > 0) {
        const parsedRoutings = rawRes.map(r => ({
          id: r.routing_code,
          numericId: r.id,
          code: r.routing_code,
          name: r.routing_name,
          category: r.category || '',
          isDefault: r.is_default,
          appliedCount: r.applied_count || 0,
          nodes: (r.nodes || []).map(n => ({
            id: n.id || n.team_id,
            teamCode: n.team_code,
            teamName: n.team_name,
            factory: n.factory,
            color: n.color || '#2D1A12'
          }))
        }));
        setRoutingsList(parsedRoutings);
      } else {
        const newObj = {
          id: newRoutingForm.code,
          code: newRoutingForm.code,
          name: newRoutingForm.name,
          category: newRoutingForm.category,
          isDefault: false,
          appliedCount: 0,
          nodes: []
        };
        setRoutingsList(prev => [...prev, newObj]);
      }

      setSelectedRoutingId(newRoutingForm.code);
      setShowAddRoutingModal(false);
      if (toast) toast('success', `Đã tạo CSDL thành công Quy trình ${newRoutingForm.code}!`);
    } catch (err) {
      console.error('Lỗi tạo quy trình:', err);
      const fallbackObj = {
        id: newRoutingForm.code,
        code: newRoutingForm.code,
        name: newRoutingForm.name,
        category: newRoutingForm.category,
        isDefault: false,
        appliedCount: 0,
        nodes: []
      };
      setRoutingsList(prev => [...prev, fallbackObj]);
      setSelectedRoutingId(newRoutingForm.code);
      setShowAddRoutingModal(false);
      if (toast) toast('success', `Đã khởi tạo Quy trình ${newRoutingForm.code}!`);
    }
  };

  const handleDeleteCurrentRouting = () => {
    if (routingsList.length <= 1) {
      if (toast) toast('warning', 'Không thể xóa quy trình duy nhất còn lại!');
      return;
    }
    const targetRouting = currentRouting;

    setConfirmModalState({
      isOpen: true,
      title: 'Xác nhận xóa Quy trình sản xuất',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn Quy trình "${targetRouting.name}" (${targetRouting.code}) khỏi CSDL hệ thống?`,
      confirmText: 'Xóa Quy trình',
      onConfirm: async () => {
        try {
          const deleteId = targetRouting.numericId || targetRouting.id || targetRouting.code;
          if (deleteId) {
            await api.delete(`/production/routings/${deleteId}`);
          }
        } catch (e) {
          console.warn('Lỗi gọi API xóa quy trình:', e);
        }

        const remaining = routingsList.filter(r => r.id !== targetRouting.id && r.code !== targetRouting.code);
        setRoutingsList(remaining);
        if (remaining.length > 0) {
          setSelectedRoutingId(remaining[0].id || remaining[0].code);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        if (toast) toast('info', `Đã xóa Quy trình ${targetRouting.code} thành công!`);
      }
    });
  };

  const handleDeleteTeamFromRouting = (teamId) => {
    const routingKey = selectedRoutingId || 'QT-TU-01';
    const teamObj = (currentRoutingTeams || []).find(t => t.id === teamId || t.teamCode === teamId) || {};
    const tName = teamObj.teamName || 'Tổ sản xuất';
    const tCode = teamObj.teamCode || '';

    setConfirmModalState({
      isOpen: true,
      title: 'Xác nhận xóa Tổ khỏi Quy trình',
      message: `Bạn có chắc chắn muốn xóa Tổ "${tName}" ${tCode ? `(${tCode})` : ''} khỏi Quy trình ${routingKey}?`,
      confirmText: 'Xóa Tổ khỏi quy trình',
      onConfirm: async () => {
        try {
          const rObj = routingsList.find(r => r.id === routingKey || r.code === routingKey);
          const targetId = (rObj && rObj.numericId) ? rObj.numericId : routingKey;
          await api.delete(`/production/routings/${targetId}/nodes/${tCode || teamId}`);
        } catch (e) {
          console.warn('Lỗi gọi API xóa node backend:', e);
        }

        setRoutingTeamsMap(prev => {
          const currentList = prev[routingKey] || currentRoutingTeams || [];
          return {
            ...prev,
            [routingKey]: currentList.filter(t => t.id !== teamId && t.teamCode !== tCode)
          };
        });

        setRoutingsList(prevRoutings => prevRoutings.map(r => {
          if (r.id === routingKey || r.code === routingKey) {
            return {
              ...r,
              nodes: (r.nodes || []).filter(n => n.id !== teamId && n.team_id !== teamId && n.teamCode !== tCode)
            };
          }
          return r;
        }));

        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        if (toast) toast('info', `Đã xóa Tổ ${tName} khỏi Quy trình ${routingKey}`);
      }
    });
  };

  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    startDate: '01/08/2026',
    endDate: '15/08/2026',
    partType: '',
    stageFrom: '',
    stageTo: '',
    partName: '',
    quantity: '0/1000',
    unit: 'Cái',
    dimensions: '',
    volume: '0.1',
    material: '',
    partSku: '',
    status: 'Chờ sản xuất'
  });

  const handleCreatePlanRow = (e) => {
    e.preventDefault();
    if (!newPlanForm.partName) {
      if (toast) toast('warning', 'Vui lòng nhập Tên thành phẩm/Chi tiết!');
      return;
    }
    const idx = currentRouting.nodes.findIndex(n => n.id === activeNodeObj?.id);
    const nextNode = currentRouting.nodes[idx + 1];

    const newRow = {
      id: Date.now(),
      routingId: currentRouting.id,
      teamCode: activeNodeObj?.teamCode || 'TO-DH-01',
      startDate: newPlanForm.startDate || '01/08/2026',
      endDate: newPlanForm.endDate || '15/08/2026',
      teamName: activeNodeObj?.teamName || 'Tổ Định hình 1',
      partType: newPlanForm.partType || 'Chi tiết gia công',
      stageFrom: newPlanForm.stageFrom || (activeNodeObj?.teamName || 'Định hình'),
      stageTo: newPlanForm.stageTo || (nextNode ? nextNode.teamName : 'Kho thành phẩm'),
      partName: newPlanForm.partName,
      quantity: newPlanForm.quantity || '0/1000',
      unit: newPlanForm.unit || 'Cái',
      dimensions: newPlanForm.dimensions || '12*70*600',
      volume: newPlanForm.volume || '0.1',
      material: newPlanForm.material || 'Gỗ sồi',
      partSku: newPlanForm.partSku ? newPlanForm.partSku.toUpperCase() : `SKU-${Date.now().toString().slice(-4)}`,
      status: newPlanForm.status || 'Chờ sản xuất'
    };

    setAllExecutionPlanRows([...allExecutionPlanRows, newRow]);
    setShowAddPlanModal(false);
    setNewPlanForm({
      startDate: '01/08/2026',
      endDate: '15/08/2026',
      partType: '',
      stageFrom: '',
      stageTo: '',
      partName: '',
      quantity: '0/1000',
      unit: 'Cái',
      dimensions: '',
      volume: '0.1',
      material: '',
      partSku: '',
      status: 'Chờ sản xuất'
    });
    if (toast) toast('success', 'Đã thêm thành công dòng kế hoạch mới!');
  };

  const handleDeletePlanRow = (id) => {
    setAllExecutionPlanRows(allExecutionPlanRows.filter(r => r.id !== id));
    if (toast) toast('info', 'Đã xóa dòng kế hoạch');
  };

  return (
    <div style={{ padding: '20px 24px', backgroundColor: '#FAF6F0', minHeight: 'calc(100vh - 110px)', fontFamily: 'Inter, sans-serif' }}>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        borderBottom: '2px solid #EADCC9',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {[
            { id: 'routing', label: 'Quy trình' },
            { id: 'products', label: 'Danh sách sản phẩm' },
            { id: 'workshops', label: 'Danh sách tổ' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.98rem',
                fontWeight: activeTab === tab.id ? '800' : '600',
                color: activeTab === tab.id ? '#2D1A12' : '#6B7280',
                borderBottom: activeTab === tab.id ? '3.5px solid #2D1A12' : '3.5px solid transparent',
                paddingBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleOpenAddRoutingModal}
            style={{
              padding: '8px 18px',
              backgroundColor: '#5D3B32',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(93, 59, 50, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} /> Tạo quy trình mới
          </button>

          <button
            onClick={handleCopyRouting}
            style={{
              padding: '8px 18px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #2D1A12',
              borderRadius: '8px',
              color: '#2D1A12',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2D1A12'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#2D1A12'; }}
          >
            <Copy size={16} /> Sao chép quy trình
          </button>

          <button
            onClick={handleDeleteCurrentRouting}
            title="Xóa Quy trình hiện tại"
            style={{
              padding: '8px 14px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '8px',
              color: '#DC2626',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
          >
            <Trash2 size={16} /> Xóa quy trình
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1.5px solid #EADCC9',
        padding: '14px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(45, 26, 18, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={18} color="#5D3B32" /> Chọn Quy trình:
          </span>
          <select
            value={selectedRoutingId}
            onChange={(e) => {
              setSelectedRoutingId(e.target.value);
              const found = routingsList.find(r => r.id === e.target.value);
              if (found && found.nodes.length > 0) {
                setActiveNodeId(found.nodes[0].id);
              }
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              fontWeight: '800',
              color: '#2D1A12',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '340px'
            }}
          >
            {routingsList.map(r => (
              <option key={r.id} value={r.id}>
                {r.code} - {r.name} ({r.nodes.length} Tổ trên luồng)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
            Đang áp dụng cho {currentAppliedProducts.length} sản phẩm
          </span>
        </div>
      </div>

      {activeTab === 'routing' && (
        <div>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={18} color="#5D3B32" /> Kho Tổ sản xuất (Cấu hình từ Tab "Danh sách tổ" - Bấm chọn Tổ để thêm vào Chuỗi luồng):
              </div>
              <button
                onClick={() => setActiveTab('workshops')}
                style={{
                  padding: '5px 12px',
                  backgroundColor: '#FAF6F0',
                  border: '1.5px solid #EADCC9',
                  borderRadius: '6px',
                  color: '#5D3B32',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Settings size={14} /> Quản lý danh sách tổ
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {currentFactoryTeamsGrouped.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: '0.88rem' }}>Chưa có Tổ nào trong danh sách tổ của quy trình này. Vui lòng thêm bên Tab "Danh sách tổ".</div>
              ) : (
                currentFactoryTeamsGrouped.map(fac => (
                  <div key={fac.factory}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#6B7280', marginBottom: '10px' }}>
                      {fac.factory}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {fac.teams.map(t => {
                        const isInRouting = validPipelineNodes.some(n => n.teamCode === t.teamCode);
                        return (
                          <button
                            key={t.teamCode}
                            onClick={() => handleAddTeamToPipeline({ ...t, factory: fac.factory })}
                            title={`Click để thêm ${t.teamName} vào quy trình`}
                            style={{
                              border: 'none',
                              backgroundColor: fac.color,
                              color: '#FFFFFF',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: isInRouting ? 1 : 0.75,
                              boxShadow: isInRouting ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = isInRouting ? '1' : '0.75'}
                          >
                            {t.teamName}
                            {isInRouting ? <Check size={14} /> : <Plus size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#D97706" /> Chuỗi Quy trình Chuyển tiếp giữa các Tổ (Nhấp chọn Tổ để lọc Bảng kế hoạch bên dưới):
              </div>
              <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: '600' }}>
                Dùng nút ← → để đổi thứ tự
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: validPipelineNodes.length === 0 ? 'center' : 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              minHeight: '80px',
              padding: '12px 0'
            }}>
              {validPipelineNodes.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: '0.88rem', padding: '20px', textAlign: 'center', fontWeight: '600' }}>
                  Chưa có Tổ nào trong chuỗi luồng quy trình này. Vui lòng chọn Tổ ở khối "Kho Tổ sản xuất" phía trên để đưa vào chuỗi.
                </div>
              ) : (
                <>
                  {validPipelineNodes.map((node, idx, arr) => {
                    const isActive = activeNodeId === node.id;
                    return (
                      <React.Fragment key={node.id}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div
                            onClick={() => setActiveNodeId(node.id)}
                            style={{
                              backgroundColor: node.color || '#2D1A12',
                              color: '#FFFFFF',
                              padding: '12px 24px',
                              borderRadius: '10px',
                              fontWeight: '800',
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              boxShadow: isActive ? `0 0 0 3px #10B981, 0 4px 14px ${node.color}55` : '0 4px 10px rgba(45, 26, 18, 0.12)',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              userSelect: 'none'
                            }}
                          >
                            <span>{node.teamName}</span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.25)', paddingLeft: '8px' }}>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'left'); }}
                                  title="Di chuyển sang trái"
                                  style={{ border: 'none', background: 'transparent', color: '#FFF', cursor: 'pointer', padding: '2px' }}
                                >
                                  <ArrowLeft size={14} />
                                </button>
                              )}
                              {idx < arr.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMoveNode(node.id, 'right'); }}
                                  title="Di chuyển sang phải"
                                  style={{ border: 'none', background: 'transparent', color: '#FFF', cursor: 'pointer', padding: '2px' }}
                                >
                                  <ArrowRight size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                                title="Xóa tổ khỏi chuỗi"
                                style={{ border: 'none', background: 'transparent', color: '#F87171', cursor: 'pointer', padding: '2px', marginLeft: '2px' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {isActive && (
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#10B981', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                              Đang chọn
                            </span>
                          )}
                        </div>

                        <ArrowRight size={24} color="#9CA3AF" />
                      </React.Fragment>
                    );
                  })}

                  <div style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle2 size={18} /> Kho thành phẩm
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            boxShadow: '0 2px 12px rgba(45, 26, 18, 0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Kế hoạch thực hiện</span>
                {activeNodeObj && (
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Công đoạn: {activeNodeObj.teamName}
                  </span>
                )}
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#FAF6F0', padding: '3px 10px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                  SKU: {currentRouting.code}
                </span>
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm chi tiết, mã SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.82rem' }}
                  />
                </div>
                <button
                  onClick={() => setShowAddPlanModal(true)}
                  style={{ padding: '7px 16px', background: '#5D3B32', border: 'none', borderRadius: '6px', color: '#FFF', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(93,59,50,0.2)' }}
                >
                  <Plus size={16} /> Thêm mới
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#6D4C3D', color: '#FFFFFF' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '45px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>STT</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày bắt đầu (dự kiến)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Ngày kết thúc (dự kiến)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tổ</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '120px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Loại</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn giao</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Công đoạn nhận</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Tên thành phẩm</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Số lượng</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Đơn vị</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Quy cách (mm)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', width: '85px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Khối lượng (m3)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Vật liệu</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', width: '140px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Mã thành phẩm</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '100px', borderRight: '1px solid rgba(255,255,255,0.15)', fontWeight: '700' }}>Trạng thái</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px', fontWeight: '700' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExecutionPlanRows.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontWeight: '600' }}>
                        Không có dữ liệu kế hoạch cho công đoạn {activeNodeObj?.teamName || 'hiện tại'}. Nhấp nút "+ Thêm mới" để bổ sung.
                      </td>
                    </tr>
                  ) : (
                    filteredExecutionPlanRows.map((r, idx) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{r.startDate}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{r.endDate}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '700', color: '#1E293B' }}>{r.teamName}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.partType}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.stageFrom}</td>
                        <td style={{ padding: '8px 10px', color: '#0284C7', fontWeight: '700' }}>{r.stageTo}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0F172A' }}>{r.partName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#1E293B' }}>{r.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B' }}>{r.unit}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#475569' }}>{r.dimensions}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#334155' }}>{r.volume}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.material}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: '800', color: '#5D3B32' }}>{r.partSku}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FDE68A'
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeletePlanRow(r.id)}
                            title="Xóa dòng kế hoạch"
                            style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          {/* Top Search & Filter Bar for Products */}
          <div style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#2D1A12' }}>
                Danh sách Sản phẩm thuộc Dòng hàng: {currentRouting.category || currentRouting.code}
              </span>
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                Tự động đồng bộ từ CSDL BOM Master theo mã Dòng hàng (Tổng cộng {currentAppliedProducts.length.toLocaleString('vi-VN')} sản phẩm)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm mã SKU, tên sản phẩm..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '7px 30px 7px 32px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.84rem' }}
                />
                {productSearchTerm && (
                  <button
                    onClick={() => setProductSearchTerm('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '540px', backgroundColor: '#FFFDF9', padding: '0 12px 12px 12px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ color: '#8B5E3C' }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '65px', borderRadius: '8px 0 0 8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>STT</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '210px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>MÃ SẢN PHẨM</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>TÊN SẢN PHẨM</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>QUY TRÌNH ÁP DỤNG</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '170px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>THỜI GIAN ÁP DỤNG</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', padding: '14px 16px', fontWeight: '800', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: '130px', textAlign: 'center', borderRadius: '0 8px 8px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppliedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontWeight: '600', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #F3EBE1' }}>
                      {productSearchTerm ? 'Không tìm thấy sản phẩm nào phù hợp với từ khóa.' : 'Chưa có sản phẩm nào gán cho quy trình này.'}
                    </td>
                  </tr>
                ) : (
                  paginatedAppliedProducts.map((p, idx) => (
                    <tr key={p.id} style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #F3EBE1', borderRadius: '10px' }}>
                      <td style={{ padding: '12px 16px', color: '#6B7280', fontWeight: '600', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1', borderLeft: '1px solid #F3EBE1' }}>
                        {productPage * productRowsPerPage + idx + 1}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '800', color: '#374151', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                        {p.code}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#111827', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0284C7', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                        {p.routingCode}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280', fontWeight: '500', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1' }}>
                        {p.applyDate}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', borderTop: '1px solid #F3EBE1', borderBottom: '1px solid #F3EBE1', borderRight: '1px solid #F3EBE1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 12px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: '#ECFDF5',
                          color: '#10B981',
                          border: '1px solid #A7F3D0'
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer matching reference screenshot */}
          <div style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #F3EBE1',
            backgroundColor: '#FFFDF9',
            fontSize: '0.84rem'
          }}>
            <div style={{ color: '#6B7280', fontWeight: '500' }}>
              Hiển thị <strong style={{ color: '#111827', fontWeight: '700' }}>{paginatedAppliedProducts.length}</strong> trên <strong style={{ color: '#111827', fontWeight: '700' }}>{filteredAppliedProducts.length.toLocaleString('vi-VN')}</strong> sản phẩm
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setProductPage(p => Math.max(0, p - 1))}
                disabled={productPage === 0}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: productPage === 0 ? '#CBD5E1' : '#64748B',
                  cursor: productPage === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.84rem',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                &lt; Trước
              </button>

              {(() => {
                const pages = [];
                const maxButtons = 5;
                let start = Math.max(0, productPage - 2);
                let end = Math.min(totalProductPages - 1, start + maxButtons - 1);
                if (end - start + 1 < maxButtons) {
                  start = Math.max(0, end - maxButtons + 1);
                }

                for (let i = start; i <= end; i++) {
                  const isActive = i === productPage;
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setProductPage(i)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isActive ? '#5D3B32' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#334155',
                        fontWeight: isActive ? '800' : '600',
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {i + 1}
                    </button>
                  );
                }
                return pages;
              })()}

              <button
                onClick={() => setProductPage(p => Math.min(totalProductPages - 1, p + 1))}
                disabled={productPage >= totalProductPages - 1}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: productPage >= totalProductPages - 1 ? '#CBD5E1' : '#64748B',
                  cursor: productPage >= totalProductPages - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.84rem',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                Sau &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workshops' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
        }}>
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #EADCC9',
            backgroundColor: '#FAF6F0'
          }}>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#2D1A12' }}>
                Danh sách Tổ thuộc Quy trình: {currentRouting.code} ({currentRouting.name})
              </span>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                Danh sách tổ ở tab này sẽ hiển thị trực tiếp ở khối "Kho Tổ sản xuất" ở Tab Quy trình (Ảnh 1)
              </span>
            </div>

            <button
              onClick={handleOpenAddTeamModal}
              style={{
                padding: '8px 18px',
                backgroundColor: '#5D3B32',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={18} /> Thêm tổ vào quy trình
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '140px' }}>Mã tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '220px' }}>Tên tổ</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '160px' }}>Tên nhà máy</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800' }}>Mô tả công việc & Năng lực</th>
                  <th style={{ padding: '12px 16px', fontWeight: '800', width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentRoutingTeams.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontWeight: '600' }}>
                      Chưa có Tổ nào thuộc Quy trình này. Nhấp nút "Thêm tổ vào quy trình" góc trên để bổ sung.
                    </td>
                  </tr>
                ) : (
                  currentRoutingTeams.map((t, idx) => (
                    <tr key={t.id || t.teamCode} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: idx % 2 === 1 ? '#FAF6F0' : '#FFFFFF' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '800', color: '#5D3B32' }}>{t.teamCode}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1F2937' }}>{t.teamName}</td>
                      <td style={{ padding: '12px 16px', color: '#4B5563', fontWeight: '700' }}>{t.factory}</td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{t.desc}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteTeamFromRouting(t.id)}
                          title="Xóa tổ khỏi quy trình"
                          style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddTeamModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '460px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                Thêm Tổ vào Quy trình {currentRouting.code}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTeam}>
              {/* FIELD 1 (ĐƯA LÊN ĐẦU & XÁM KHÔNG CẦN NHẬP): Mã Tổ Tự động Khởi tạo */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mã Tổ sản xuất (Tự động khởi tạo)
                </label>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={newTeamForm.teamCode || `TO-NM1-${Math.floor(100 + Math.random() * 900)}`}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #D1D5DB',
                    backgroundColor: '#F3F4F6',
                    color: '#4B5563',
                    outline: 'none',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    fontFamily: 'monospace',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              {/* FIELD 2: Thuộc Nhà máy / Xưởng */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Thuộc Nhà máy / Xưởng *
                </label>
                <select
                  value={newTeamForm.factory}
                  onChange={(e) => {
                    const fac = e.target.value;
                    const facNum = fac.replace(/\D/g, '') || '1';
                    const stages = factoryStagesMap[fac] || [];
                    const defaultStage = stages[0] || '';
                    setNewTeamForm({
                      ...newTeamForm,
                      factory: fac,
                      teamCode: `TO-NM${facNum}-${Math.floor(100 + Math.random() * 900)}`,
                      teamName: defaultStage,
                      desc: defaultStage ? `Tổ phụ trách công đoạn ${defaultStage}` : ''
                    });
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                >
                  <option value="Nhà máy 1">Nhà máy 1</option>
                  <option value="Nhà máy 2">Nhà máy 2</option>
                  <option value="Nhà máy 3">Nhà máy 3</option>
                  <option value="Nhà máy 4">Nhà máy 4</option>
                </select>
              </div>

              {/* FIELD 3: Tên Tổ sản xuất (Lọc theo Nhà máy đã chọn) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Tên Tổ sản xuất (Lọc theo {newTeamForm.factory}) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={availableStagesForFactory.includes(newTeamForm.teamName) ? newTeamForm.teamName : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedName = e.target.value;
                        setNewTeamForm({
                          ...newTeamForm,
                          teamName: selectedName,
                          desc: `Tổ phụ trách công đoạn ${selectedName}`
                        });
                      }
                    }}
                    style={{ width: '50%', padding: '9px 10px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.84rem', fontWeight: '700', backgroundColor: '#FAF6F0', color: '#2D1A12' }}
                  >
                    <option value="">-- Chọn công đoạn {newTeamForm.factory} --</option>
                    {availableStagesForFactory.map((stage, idx) => (
                      <option key={idx} value={stage}>{stage}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Hoặc nhập tên Tổ..."
                    value={newTeamForm.teamName}
                    onChange={(e) => setNewTeamForm({ ...newTeamForm, teamName: e.target.value })}
                    style={{ width: '50%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* FIELD 4: Mô tả công việc & Năng lực */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mô tả công việc & Năng lực
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyên gia công phay & dán nẹp"
                  value={newTeamForm.desc}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFF', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#5D3B32', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Thêm Tổ mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddRoutingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '460px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>
                Tạo Quy trình sản xuất mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoutingModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRouting}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mã Quy trình sản xuất *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: QT-TU-02"
                  value={newRoutingForm.code}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, code: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '800', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Tên Quy trình sản xuất *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy trình sản xuất Tủ bếp gỗ tự nhiên"
                  value={newRoutingForm.name}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Dòng hàng *
                </label>
                <select
                  value={newRoutingForm.category}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontWeight: '700' }}
                >
                  <option value="Dòng hàng APT">Dòng hàng APT (1,380 SP)</option>
                  <option value="Dòng hàng ATL">Dòng hàng ATL (512 SP)</option>
                  <option value="Dòng hàng FOL">Dòng hàng FOL (509 SP)</option>
                  <option value="Dòng hàng ADV">Dòng hàng ADV (482 SP)</option>
                  <option value="Dòng hàng TPH">Dòng hàng TPH (114 SP)</option>
                  <option value="Dòng hàng HOR">Dòng hàng HOR (32 SP)</option>
                  <option value="Dòng hàng EYC">Dòng hàng EYC (27 SP)</option>
                  <option value="Dòng hàng COV">Dòng hàng COV (10 SP)</option>
                  <option value="Dòng hàng Khác">Dòng hàng Khác</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Mô tả quy trình
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả quy trình..."
                  value={newRoutingForm.desc}
                  onChange={(e) => setNewRoutingForm({ ...newRoutingForm, desc: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', fontSize: '0.88rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRoutingModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFF', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#5D3B32', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Lưu Quy Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            width: '440px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1.5px solid #FCA5A5',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '2px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#DC2626'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: '800', color: '#1F2937' }}>
              {confirmModalState.title || 'Xác nhận thực hiện'}
            </h3>

            <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.5' }}>
              {confirmModalState.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1.5px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModalState.onConfirm) confirmModalState.onConfirm();
                }}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}
              >
                {confirmModalState.confirmText || 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionRoutingView;

