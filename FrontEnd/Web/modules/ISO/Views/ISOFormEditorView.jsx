import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle, AlertCircle, 
  ListPlus, Settings, FileText, Activity,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Undo2, Redo2 
} from 'lucide-react';
import '@styles/components.css';
import FlowchartCanvas from './FlowchartCanvas';
import FlowchartTable from './FlowchartTable';

const RichTextEditor = ({ value, onChange, placeholder, style = {} }) => {
  const editorRef = React.useRef(null);

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (e, command, val = null) => {
    e.preventDefault();
    document.execCommand(command, false, val);
    handleInput();
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#7B5233',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  };

  const dividerStyle = {
    width: '1px',
    height: '20px',
    backgroundColor: '#EADCC9',
    margin: '0 6px',
  };

  return (
    <div style={{ border: '1px solid #7B5233', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', display: 'flex', flexDirection: 'column', ...style }}>
      <style>{`
        .rich-editor-area:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          cursor: text;
          font-style: italic;
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#FAF6F0',
        borderBottom: '1px solid #EADCC9',
        alignItems: 'center',
        userSelect: 'none'
      }}>
        <select 
          onChange={(e) => executeCommand(e, 'formatBlock', e.target.value)}
          defaultValue="p"
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: 'white',
            fontSize: '0.8rem',
            color: '#7B5233',
            fontWeight: 'bold',
            outline: 'none',
            marginRight: '6px',
            cursor: 'pointer'
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="pre">Preformatted</option>
        </select>

        <span style={dividerStyle} />

        <button type="button" onMouseDown={(e) => executeCommand(e, 'bold')} style={btnStyle} title="Đậm" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Bold size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'italic')} style={btnStyle} title="Nghiêng" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Italic size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'underline')} style={btnStyle} title="Gạch chân" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Underline size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'strikeThrough')} style={btnStyle} title="Gạch đè" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Strikethrough size={15} /></button>
        
        <span style={dividerStyle} />
        
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyLeft')} style={btnStyle} title="Căn trái" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><AlignLeft size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyCenter')} style={btnStyle} title="Căn giữa" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><AlignCenter size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyRight')} style={btnStyle} title="Căn phải" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><AlignRight size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyFull')} style={btnStyle} title="Căn đều" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><AlignJustify size={15} /></button>
        
        <span style={dividerStyle} />
        
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')} style={btnStyle} title="Danh sách chấm" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><List size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertOrderedList')} style={btnStyle} title="Danh sách số" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ListOrdered size={15} /></button>
        
        <span style={dividerStyle} />
        
        <button type="button" onMouseDown={(e) => executeCommand(e, 'undo')} style={btnStyle} title="Hoàn tác" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Undo2 size={15} /></button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'redo')} style={btnStyle} title="Làm lại" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5eee6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Redo2 size={15} /></button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="rich-editor-area"
        style={{
          minHeight: '160px',
          padding: '16px',
          outline: 'none',
          fontSize: '0.92rem',
          lineHeight: '1.6',
          fontFamily: 'inherit',
          color: '#2d1a12',
          overflowY: 'auto'
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

const renderStepName = (name, x) => {
  const words = (name || '').split(' ');
  let line1 = '';
  let line2 = '';
  for (let word of words) {
    if ((line1 + ' ' + word).trim().length <= 18) {
      line1 = line1 ? line1 + ' ' + word : word;
    } else {
      line2 = line2 ? line2 + ' ' + word : word;
    }
  }
  
  if (line2.length > 18) {
    line2 = line2.substring(0, 15) + '...';
  }
  
  if (line2) {
    return (
      <>
        <tspan x={x} dy="-3">{line1}</tspan>
        <tspan x={x} dy="12">{line2}</tspan>
      </>
    );
  }
  return <tspan x={x} dy="3">{name}</tspan>;
};

const formatRoleText = (role) => {
  if (!role) return '';
  if (role.startsWith('-')) return role;
  const upper = role.toUpperCase();
  if (upper.includes('QC') || upper.includes('QLCL')) return '- Bộ phận QC';
  if (upper.includes('KHO')) return '- Bộ phận kho';
  if (upper.includes('SẢN XUẤT') || upper.includes('SX')) return '- Bộ phận sản xuất';
  if (upper.includes('THU MUA') || upper.includes('MUA')) return '- Bộ phận thu mua';
  if (upper.includes('BÁN HÀNG') || upper.includes('KD')) return '- Bộ phận bán hàng';
  return `- ${role}`;
};

const isSameRole = (roleA, roleB) => {
  if (!roleA || !roleB) return false;
  const clean = (r) => {
    let s = r.trim().toUpperCase();
    if (s.startsWith('-')) s = s.substring(1).trim();
    if (s.includes('BỘ PHẬN')) s = s.replace('BỘ PHẬN', '').trim();
    if (s.includes('QC') || s.includes('QLCL')) return 'QC';
    if (s.includes('KHO')) return 'KHO';
    if (s.includes('SẢN XUẤT') || s.includes('SX')) return 'SANXUAT';
    if (s.includes('THU MUA') || s.includes('MUA')) return 'THUMUA';
    if (s.includes('BÁN HÀNG') || s.includes('KD') || s.includes('KINH DOANH')) return 'BANHANG';
    if (s.includes('ADMIN') || s.includes('GIÁM ĐỐC') || s.includes('BAN GIÁM ĐỐC')) return 'ADMIN';
    return s;
  };
  return clean(roleA) === clean(roleB);
};

const renderTemplateText = (text, x) => {
  if (!text) return null;
  const parts = text.split(/[\s\n]+/);
  return parts.map((part, pIdx) => (
    <tspan key={pIdx} x={x} dy={pIdx === 0 ? 12 : 14}>{part}</tspan>
  ));
};

const ISOFormEditorView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const fromProcesses = location.state?.fromProcesses;
  const backPath = fromProcesses ? '/admin/iso-processes' : '/admin/iso-documents';

  const isEditMode = id && id !== 'new';

  // State quản lý tabs: 'general', 'content', 'workflow', 'checklist'
  const [activeTab, setActiveTab] = useState('general');
  const [editingCell, setEditingCell] = useState(null); // { stepIndex, field, value, rect }

  const handleCellClick = (stepIndex, field, e, value) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setEditingCell({
      stepIndex,
      field,
      value: value || '',
      rect: {
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, 120),
        height: Math.max(rect.height, 24)
      }
    });
  };

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    file_path: '',
    status: 'Hiệu lực',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {
      'Mục đích': '',
      'Phạm vi áp dụng': '',
      'Tài liệu viện dẫn': '',
      'Định nghĩa và Từ viết tắt': ''
    },
    steps: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedStepIdx, setSelectedStepIdx] = useState(null);
  const stepCardsRef = useRef([]);
  const [flowTab, setFlowTab] = useState('canvas'); // 'canvas' | 'table'

  useEffect(() => {
    setCustomTitle('G7 - Smart Flow');
    if (fromProcesses) {
      setCustomSubtitle(isEditMode ? 'Thiết lập & Cấu hình Quy trình ISO' : 'Thêm mới Quy trình & Checklist ISO');
      setCustomScreenCode(isEditMode ? 'ISO-PROC-EDIT' : 'ISO-PROC-CREATE');
    } else {
      setCustomSubtitle(isEditMode ? 'Chỉnh sửa tài liệu ISO & Quy trình' : 'Thêm mới tài liệu ISO & Quy trình');
      setCustomScreenCode(isEditMode ? 'ISO-EDIT' : 'ISO-CREATE');
    }

    if (location.state && location.state.parsedData) {
      // Nhận dữ liệu bóc tách được từ tệp Word vừa upload
      const parsed = location.state.parsedData;
      setFormData({
        id: null,
        code: parsed.code || '',
        name: parsed.name || '',
        version: parsed.version || '01',
        issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
        issuer: parsed.issuer || '',
        approver: parsed.approver || '',
        file_path: parsed.file_path || '',
        status: parsed.status || 'Hiệu lực',
        revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
          { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
        ],
        sections: {
          'Mục đích': parsed.sections?.['Mục đích'] || '',
          'Phạm vi áp dụng': parsed.sections?.['Phạm vi áp dụng'] || '',
          'Tài liệu viện dẫn': parsed.sections?.['Tài liệu viện dẫn'] || '',
          'Định nghĩa và Từ viết tắt': parsed.sections?.['Định nghĩa và Từ viết tắt'] || ''
        },
        steps: (parsed.steps || []).map(step => ({
          ...step,
          node_type: step.node_type || 'task',
          has_branch: step.has_branch !== undefined ? step.has_branch : false,
          fail_path: step.fail_path || []
        }))
      });
      showFeedback('success', 'Đã bóc tách tự động dữ liệu từ file Word thành công!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      // Tự động sinh mã hiệu tạm thời cho form trống nhưng cho phép người dùng chỉnh sửa
      const tempCode = 'G7.ISO-' + Math.floor(100 + Math.random() * 900);
      setFormData(prev => ({
        ...prev,
        code: tempCode
      }));
    }
  }, [id]);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/iso-documents/${id}/details`);
      setFormData({
        id: data.id,
        code: data.code || '',
        name: data.name || '',
        version: data.version || '01',
        issue_date: data.issue_date || '',
        issuer: data.issuer || '',
        approver: data.approver || '',
        file_path: data.file_path || '',
        status: data.status || 'Hiệu lực',
        revision_logs: data.revision_logs || [],
        sections: {
          'Mục đích': data.sections?.['Mục đích'] || '',
          'Phạm vi áp dụng': data.sections?.['Phạm vi áp dụng'] || '',
          'Tài liệu viện dẫn': data.sections?.['Tài liệu viện dẫn'] || '',
          'Định nghĩa và Từ viết tắt': data.sections?.['Định nghĩa và Từ viết tắt'] || ''
        },
        steps: (data.steps || []).map(step => ({
          ...step,
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || []
        }))
      });
    } catch (error) {
      console.error('Lỗi khi tải chi tiết quy trình:', error);
      showFeedback('error', 'Không thể tải chi tiết quy trình từ hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 4500);
  };

  // Cập nhật trường thông tin chung
  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  // Cập nhật nội dung các mục hướng dẫn lớn
  const handleSectionChange = (sectionName, val) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: val
      }
    }));
  };

  // --- QUẢN LÝ NHẬT KÝ SỬA ĐỔI (REVISION LOGS) ---
  const handleAddRevLog = () => {
    setFormData(prev => ({
      ...prev,
      revision_logs: [
        ...prev.revision_logs,
        { seq_no: prev.revision_logs.length + 1, rev_date: '', content: '', page_no: '' }
      ]
    }));
  };

  const handleUpdateRevLog = (index, field, val) => {
    setFormData(prev => {
      const nextLogs = [...prev.revision_logs];
      nextLogs[index] = { ...nextLogs[index], [field]: val };
      return { ...prev, revision_logs: nextLogs };
    });
  };

  const handleRemoveRevLog = (index) => {
    setFormData(prev => {
      const nextLogs = prev.revision_logs.filter((_, idx) => idx !== index)
        .map((log, idx) => ({ ...log, seq_no: idx + 1 }));
      return { ...prev, revision_logs: nextLogs };
    });
  };

  // --- QUẢN LÝ CÁC BƯỚC QUY TRÌNH (WORKFLOW STEPS) ---
  const handleAddStep = () => {
    const nextStepNum = formData.steps.length + 1;
    const newStep = {
      step_number: nextStepNum,
      name: `Bước mới ${nextStepNum}`,
      assignee_role: 'QC',
      instructions: '',
      checklist: [],
      transition: { next_step: nextStepNum + 1 },
      flow_node_id: `node_${nextStepNum}`,
      node_type: 'task',
      has_branch: false
    };
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const getStepFailPath = (step) => {
    if (!step) return [];
    if (step.fail_path && step.fail_path.length > 0) {
      return step.fail_path;
    }
    if (step.has_branch === true) {
      const defaultRole = step.assignee_role || 'QC';
      return [
        { name: step.fail_node_name_1 || "Cập nhật báo cáo thông tin các bên liên quan", assignee_role: defaultRole },
        { name: step.fail_node_name_2 || "Sản phẩm không phù hợp", assignee_role: defaultRole },
        { name: step.fail_node_name_3 || "Trả hàng nhà cung cấp", assignee_role: defaultRole }
      ];
    }
    return [];
  };

  const handleUpdateStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      if (field.startsWith('fail_path_')) {
        const nodeIdx = parseInt(field.split('_')[2]);
        const currentPath = [...getStepFailPath(nextSteps[index])];
        currentPath[nodeIdx] = { ...currentPath[nodeIdx], name: val };
        nextSteps[index] = { ...nextSteps[index], fail_path: currentPath };
      } else {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, steps: nextSteps };
    });
  };


  // Lưu vị trí kéo thả từ FlowchartCanvas về formData
  const handlePositionsChange = useCallback(({ type, stepNumber, branchIdx, x, y }) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const stepIdx = nextSteps.findIndex(s => s.step_number === stepNumber);
      if (stepIdx < 0) return prev;

      if (type === 'step') {
        nextSteps[stepIdx] = { ...nextSteps[stepIdx], x_pos: x, y_pos: y };
      } else if (type === 'branch') {
        const currentPath = [...(nextSteps[stepIdx].fail_path || [])];
        if (currentPath[branchIdx]) {
          currentPath[branchIdx] = { ...currentPath[branchIdx], x_pos: x, y_pos: y };
          nextSteps[stepIdx] = { ...nextSteps[stepIdx], fail_path: currentPath };
        }
      }
      return { ...prev, steps: nextSteps };
    });
  }, []);

  // Thêm bước mới khi kéo thả hình từ palette vào canvas
  const handleAddStepFromCanvas = useCallback((nodeType, position) => {
    setFormData(prev => {
      const nextStepNum = prev.steps.length + 1;
      const newStep = {
        step_number: nextStepNum,
        name: nodeType === 'decision' ? `Kiểm tra ${nextStepNum}` : nodeType === 'terminal' ? `Kết thúc` : `Bước mới ${nextStepNum}`,
        assignee_role: 'QC',
        instructions: '',
        checklist: [],
        transition: { next_step: nextStepNum + 1 },
        flow_node_id: `node_${nextStepNum}`,
        node_type: nodeType,
        has_branch: false,
        fail_path: [],
        x_pos: position.x,
        y_pos: position.y,
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
  }, []);

  // Khi click node trên canvas → highlight + cuộn đến card
  const handleNodeSelect = useCallback((stepNumber) => {
    const idx = formData.steps.findIndex(s => s.step_number === stepNumber);
    setSelectedStepIdx(idx);
    if (idx >= 0 && stepCardsRef.current[idx]) {
      setTimeout(() => {
        stepCardsRef.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [formData.steps]);

  // Cập nhật bước từ Properties Panel trên canvas
  const handleUpdateStepFromCanvas = useCallback((stepIndex, field, value) => {
    handleUpdateStep(stepIndex, field, value);
  }, []);

  // Xóa bước từ Properties Panel trên canvas
  const handleDeleteStepFromCanvas = useCallback((stepIndex) => {
    handleRemoveStep(stepIndex);
  }, []);

  const handleRemoveStep = (index) => {
    setFormData(prev => {
      const nextSteps = prev.steps.filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1, flow_node_id: `node_${idx + 1}` }));
      return { ...prev, steps: nextSteps };
    });
  };


  // Thay đổi thứ tự bước
  const handleMoveStep = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.steps.length - 1) return;

    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      const temp = nextSteps[index];
      nextSteps[index] = nextSteps[targetIndex];
      nextSteps[targetIndex] = temp;

      // Reset step_number và node id
      const updated = nextSteps.map((step, idx) => ({
        ...step,
        step_number: idx + 1,
        flow_node_id: `node_${idx + 1}`
      }));

      return { ...prev, steps: updated };
    });
  };

  // --- THIẾT LẬP CHECKLIST QC CHO TỪNG BƯỚC ---
  const [selectedStepForChecklist, setSelectedStepForChecklist] = useState(0);

  const handleAddChecklistItem = (stepIdx) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const currentChecklist = nextSteps[stepIdx].checklist || [];
      const updatedChecklist = [
        ...currentChecklist,
        {
          name: '',
          method: 'Kiểm tra ngoại quan',
          result_type: 'pass_fail', // pass_fail, number, text
          critical_level: 'Major', // Critical, Major, Minor
          required_image: false
        }
      ];
      nextSteps[stepIdx] = { ...nextSteps[stepIdx], checklist: updatedChecklist };
      return { ...prev, steps: nextSteps };
    });
  };

  const handleUpdateChecklistItem = (stepIdx, itemIdx, field, val) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const updatedChecklist = [...nextSteps[stepIdx].checklist];
      updatedChecklist[itemIdx] = { ...updatedChecklist[itemIdx], [field]: val };
      nextSteps[stepIdx] = { ...nextSteps[stepIdx], checklist: updatedChecklist };
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRemoveChecklistItem = (stepIdx, itemIdx) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const updatedChecklist = nextSteps[stepIdx].checklist.filter((_, idx) => idx !== itemIdx);
      nextSteps[stepIdx] = { ...nextSteps[stepIdx], checklist: updatedChecklist };
      return { ...prev, steps: nextSteps };
    });
  };

  // --- LƯU DỮ LIỆU TOÀN BỘ FORM ---
  const handleSaveForm = async () => {
    if (!formData.code || !formData.name) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Mã quy trình và Tên quy trình');
      return;
    }

    setLoading(true);
    try {
      // 1. Tự động sinh/cập nhật sơ đồ luồng diagram_data dựa trên danh sách các bước hiện có
      const nodes = [];
      const links = [];

      formData.steps.forEach((step, idx) => {
        // Xác định loại node tự động
        let nodeType = 'task';
        const nameLower = step.name.toLowerCase();
        if (idx === 0) {
          nodeType = 'start';
        } else if (idx === formData.steps.length - 1) {
          nodeType = 'end';
        } else if (nameLower.includes('kiểm tra') || nameLower.includes('đánh giá') || nameLower.includes('quyết định')) {
          nodeType = 'decision';
        }

        nodes.push({
          id: step.flow_node_id,
          label: `B${step.step_number}: ${step.name}`,
          type: nodeType,
          role: step.assignee_role,
          x: 250,
          y: 80 + idx * 120
        });

        if (idx > 0) {
          links.push({
            from: formData.steps[idx-1].flow_node_id,
            to: step.flow_node_id,
            label: 'Đạt'
          });

          // Rẽ nhánh nếu là kiểm tra
          if (nodeType === 'decision') {
            const errNodeId = `${step.flow_node_id}_err`;
            nodes.push({
              id: errNodeId,
              label: 'Xử lý lỗi / Trả hàng',
              type: 'task',
              role: step.assignee_role,
              x: 480,
              y: 80 + idx * 120
            });
            links.push({
              from: step.flow_node_id,
              to: errNodeId,
              label: 'Không đạt'
            });
          }
        }
      });

      const stepsToSave = formData.steps.map(step => {
        const nextTransition = {
          ...(step.transition || {}),
          node_type: step.node_type || 'task',
          has_branch: step.has_branch || false,
          fail_path: getStepFailPath(step)
        };
        return {
          ...step,
          transition: nextTransition
        };
      });

      const finalPayload = {
        ...formData,
        steps: stepsToSave,
        diagram_data: JSON.stringify({ nodes, links })
      };

      const res = await api.post('/iso-documents/save', finalPayload);
      showFeedback('success', res.message || 'Lưu tài liệu quy trình ISO thành công!');
      
      // Chuyển về màn hình danh sách sau khi tạo thành công
      setTimeout(() => {
        navigate(backPath);
      }, 1000);

    } catch (error) {
      console.error('Lỗi khi lưu quy trình:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ dữ liệu quy trình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header điều khiển */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid #EADCC9',
        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.03)'
      }}>
        <button
          onClick={() => navigate(backPath)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#7B5233',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <button
          onClick={handleSaveForm}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#7B5233',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5D3E26'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
        >
          <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
        </button>
      </div>

      {/* Alert Thông báo phản hồi */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : message.type === 'error' ? '#fce8e6' : '#e8f0fe',
          color: message.type === 'success' ? '#137333' : message.type === 'error' ? '#c5221f' : '#1a73e8',
          border: `1px solid ${message.type === 'success' ? '#137333' : message.type === 'error' ? '#c5221f' : '#1a73e8'}`,
        }}>
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      {/* 2. Menu phân vùng dạng Tab */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #EADCC9',
        gap: '6px'
      }}>
        {[
          { id: 'general', name: 'Thông tin chung & Sửa đổi', icon: FileText },
          { id: 'content', name: 'Nội dung hướng dẫn chính', icon: FileText },
          { id: 'workflow', name: 'Lưu đồ & Diễn giải các bước', icon: Activity },
          { id: 'checklist', name: 'Thiết lập Checklist QC', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                borderBottom: isActive ? '3px solid #7B5233' : '3px solid transparent',
                backgroundColor: isActive ? '#FAF6F0' : 'transparent',
                color: isActive ? '#7B5233' : '#64748b',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderRadius: '8px 8px 0 0'
              }}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Nội dung biểu mẫu theo Tab hoạt động */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #EADCC9',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
      }}>

        {/* TAB 1: THÔNG TIN CHUNG & SỬA ĐỔI */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ margin: 0, color: '#7B5233', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>Thông tin bìa tài liệu</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Mã hiệu quy trình *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Ví dụ: G7.CL - QT01"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tên quy trình *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ví dụ: Quy trình kiểm soát nguyên vật liệu đầu vào"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Lần ban hành</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  placeholder="Ví dụ: 01"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Ngày ban hành</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => handleInputChange('issue_date', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Bộ phận biên soạn</label>
                <input
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => handleInputChange('issuer', e.target.value)}
                  placeholder="Ví dụ: Đặng Văn Nam (Tr.QLCL)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Cấp phê duyệt</label>
                <input
                  type="text"
                  value={formData.approver}
                  onChange={(e) => handleInputChange('approver', e.target.value)}
                  placeholder="Ví dụ: Nguyễn Hòa (Phó TGĐ)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}>Trạng thái tài liệu</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #7B5233', fontSize: '0.88rem', outline: 'none', backgroundColor: 'white' }}
                >
                  <option value="Hiệu lực">Hiệu lực</option>
                  <option value="Hết hiệu lực">Hết hiệu lực</option>
                  <option value="Dự thảo">Dự thảo</option>
                </select>
              </div>
            </div>

            <h3 style={{ margin: '20px 0 0 0', color: '#7B5233', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Bảng nhật ký sửa đổi nội dung tài liệu</span>
              <button
                type="button"
                onClick={handleAddRevLog}
                style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#FAF6F0', color: '#7B5233', border: '1px solid #7B5233', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Thêm hàng
              </button>
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9' }}>
                    <th style={{ padding: '10px', fontSize: '0.75rem', color: '#7B5233', width: '60px', textTransform: 'uppercase', textAlign: 'center' }}>Số TT</th>
                    <th style={{ padding: '10px', fontSize: '0.75rem', color: '#7B5233', width: '150px', textTransform: 'uppercase' }}>Ngày sửa</th>
                    <th style={{ padding: '10px', fontSize: '0.75rem', color: '#7B5233', textTransform: 'uppercase' }}>Nội dung sửa đổi</th>
                    <th style={{ padding: '10px', fontSize: '0.75rem', color: '#7B5233', width: '120px', textTransform: 'uppercase', textAlign: 'center' }}>Trang số</th>
                    <th style={{ padding: '10px', fontSize: '0.75rem', color: '#7B5233', width: '60px', textAlign: 'center' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.revision_logs.map((log, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>{log.seq_no}</td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={log.rev_date}
                          onChange={(e) => handleUpdateRevLog(index, 'rev_date', e.target.value)}
                          placeholder="Ngày sửa đổi"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={log.content}
                          onChange={(e) => handleUpdateRevLog(index, 'content', e.target.value)}
                          placeholder="Mô tả nội dung thay đổi..."
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={log.page_no}
                          onChange={(e) => handleUpdateRevLog(index, 'page_no', e.target.value)}
                          placeholder="Trang số"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRevLog(index)}
                          style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: NỘI DUNG HƯỚNG DẪN CHÍNH */}
        {activeTab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, color: '#7B5233', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>Nội dung văn bản quy trình chính</h3>
            
            {Object.keys(formData.sections).map(sectionName => (
              <div key={sectionName}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '6px' }}>{sectionName}</label>
                <RichTextEditor
                  value={formData.sections[sectionName]}
                  onChange={(val) => handleSectionChange(sectionName, val)}
                  placeholder={`Nhập nội dung cho phần: ${sectionName}...`}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: LƯU ĐỒ & DIỄN GIẢI CÁC BƯỚC */}
        {activeTab === 'workflow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ margin: 0, color: '#7B5233', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Danh sách các bước công việc & Lưu đồ</span>
              <button
                type="button"
                onClick={handleAddStep}
                style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#7B5233', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + Thêm Bước mới
              </button>
            </h3>

            {/* Tab switch cho Sơ đồ và Bảng lưu đồ */}
            {formData.steps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '10px' }}>
                
                {/* Thanh chọn Tab */}
                <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', gap: '8px', paddingBottom: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setFlowTab('canvas')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'none',
                      color: flowTab === 'canvas' ? '#7B5233' : '#64748b',
                      borderBottom: flowTab === 'canvas' ? '3px solid #7B5233' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ✏️ Sơ đồ thiết kế (kéo thả)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowTab('table')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'none',
                      color: flowTab === 'table' ? '#7B5233' : '#64748b',
                      borderBottom: flowTab === 'table' ? '3px solid #7B5233' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📊 Bản in chuẩn ISO (bảng biểu)
                  </button>
                </div>

                {/* Nội dung Tab */}
                {flowTab === 'canvas' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        💡 Kéo thả hình từ cột trái vào canvas để thêm bước · Kéo node để di chuyển · Chọn node rồi nhấn Delete để xóa
                      </span>
                    </div>
                    <FlowchartCanvas
                      steps={formData.steps}
                      onPositionsChange={handlePositionsChange}
                      onAddStep={handleAddStepFromCanvas}
                      onUpdateStep={handleUpdateStepFromCanvas}
                      onDeleteStep={handleDeleteStepFromCanvas}
                      onNodeSelect={handleNodeSelect}
                    />
                  </div>
                ) : (
                  <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                    <FlowchartTable steps={formData.steps} />
                  </div>
                )}

              </div>
            )}


            {/* B. Bảng biểu danh sách các bước chi tiết dạng form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formData.steps.map((step, index) => (
                <div
                  key={index}
                  ref={(el) => stepCardsRef.current[index] = el}
                  style={{
                    border: selectedStepIdx === index ? '2px solid #7B5233' : '1px solid #EADCC9',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: selectedStepIdx === index ? '#FDF6EE' : index % 2 === 1 ? '#FAF6F0' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'border-color 0.3s, background-color 0.3s',
                    scrollMarginTop: '16px',
                  }}
                >
                  {/* Tiêu đề bước + Nút điều hướng thứ tự */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#7B5233',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}>
                        Bước {step.step_number}
                      </span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => handleUpdateStep(index, 'name', e.target.value)}
                        placeholder="Nhập tên bước..."
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 'bold', width: '250px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} style={{ padding: '3px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '4px' }}><ChevronUp size={14} /></button>
                      <button type="button" onClick={() => handleMoveStep(index, 'down')} disabled={index === formData.steps.length - 1} style={{ padding: '3px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: 'white', borderRadius: '4px' }}><ChevronDown size={14} /></button>
                      <button type="button" onClick={() => handleRemoveStep(index)} style={{ padding: '3px', cursor: 'pointer', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '4px' }}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Input Phân quyền Trách nhiệm & Mẫu đính kèm */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hình khối (Sơ đồ)</label>
                      <select
                        value={step.node_type || 'task'}
                        onChange={(e) => handleUpdateStep(index, 'node_type', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                      >
                        <option value="task">Hình chữ nhật (Công việc)</option>
                        <option value="decision">Hình thoi (Kiểm tra / Rẽ nhánh)</option>
                        <option value="start">Hình Oval (Bắt đầu)</option>
                        <option value="end">Hình Oval (Kết thúc)</option>
                      </select>
                      {step.node_type === 'decision' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <input
                              type="checkbox"
                              id={`has_branch_${index}`}
                              checked={step.has_branch === true}
                              onChange={(e) => handleUpdateStep(index, 'has_branch', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor={`has_branch_${index}`} style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>
                              Vẽ nhánh rẽ phụ
                            </label>
                          </div>
                          
                          {step.has_branch === true && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', border: '1px solid #EADCC9', borderRadius: '4px', backgroundColor: '#FAF6F0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EADCC9', paddingBottom: '4px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>Cấu hình nội dung nhánh rẽ:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentPath = getStepFailPath(step);
                                    const newPath = [...currentPath, { name: 'Khối rẽ mới', assignee_role: 'QC' }];
                                    handleUpdateStep(index, 'fail_path', newPath);
                                  }}
                                  style={{ padding: '2px 8px', fontSize: '0.65rem', backgroundColor: '#7B5233', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  + Thêm khối rẽ
                                </button>
                              </div>

                              {getStepFailPath(step).map((pathNode, nodeIdx) => (
                                <div key={nodeIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: 'white', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#7B5233', minWidth: '15px' }}>#{nodeIdx + 1}</span>
                                  
                                  <div style={{ flex: 2 }}>
                                    <input
                                      type="text"
                                      value={pathNode.name}
                                      onChange={(e) => {
                                        const currentPath = [...getStepFailPath(step)];
                                        currentPath[nodeIdx] = { ...currentPath[nodeIdx], name: e.target.value };
                                        handleUpdateStep(index, 'fail_path', currentPath);
                                      }}
                                      placeholder="Tên khối công việc..."
                                      style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem' }}
                                    />
                                  </div>

                                  <div style={{ flex: 1.2 }}>
                                    <select
                                      value={pathNode.assignee_role}
                                      onChange={(e) => {
                                        const currentPath = [...getStepFailPath(step)];
                                        currentPath[nodeIdx] = { ...currentPath[nodeIdx], assignee_role: e.target.value };
                                        handleUpdateStep(index, 'fail_path', currentPath);
                                      }}
                                      style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', backgroundColor: 'white' }}
                                    >
                                      <option value="Kho">Bộ phận Kho</option>
                                      <option value="QC">Bộ phận QC</option>
                                      <option value="Sản xuất">Bộ phận Sản xuất</option>
                                      <option value="Thu mua">Bộ phận Thu mua</option>
                                      <option value="Bán hàng">Bộ phận Bán hàng</option>
                                      <option value="Admin">Ban Giám Đốc / Admin</option>
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentPath = getStepFailPath(step).filter((_, nIdx) => nIdx !== nodeIdx);
                                      handleUpdateStep(index, 'fail_path', currentPath);
                                    }}
                                    style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Bộ phận chịu trách nhiệm</label>
                      <select
                        value={step.assignee_role}
                        onChange={(e) => handleUpdateStep(index, 'assignee_role', e.target.value)}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                      >
                        <option value="Kho">Bộ phận Kho</option>
                        <option value="QC">Bộ phận QC / QLCL</option>
                        <option value="Sản xuất">Bộ phận Sản xuất</option>
                        <option value="Thu mua">Bộ phận Thu mua</option>
                        <option value="Bán hàng">Bộ phận Bán hàng / KD</option>
                        <option value="Admin">Ban Giám Đốc / Admin</option>
                      </select>
                    </div>

                    <div style={{ flex: 2, minWidth: '250px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Biểu mẫu đính kèm (nếu có)</label>
                      <input
                        type="text"
                        value={step.template_files || ''}
                        onChange={(e) => handleUpdateStep(index, 'template_files', e.target.value)}
                        placeholder="Ví dụ: Kế hoạch giao nhận hàng, Phiếu nhập kho..."
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  {/* Textarea Diễn giải các bước (Rich Text / Plain) */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Diễn giải công việc chi tiết của bước</label>
                    <RichTextEditor
                      value={step.instructions}
                      onChange={(val) => handleUpdateStep(index, 'instructions', val)}
                      placeholder="Ghi chú hướng dẫn các công việc cần làm..."
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: THIẾT LẬP CHECKLIST QC */}
        {activeTab === 'checklist' && (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            
            {/* Cột trái chọn bước để cấu hình */}
            <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>CHỌN BƯỚC QC CẦU HÌNH</span>
              {formData.steps.map((step, idx) => {
                const isSelected = selectedStepForChecklist === idx;
                const isQC = step.assignee_role === 'QC';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedStepForChecklist(idx)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1.5px solid #7B5233' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#FAF6F0' : 'white',
                      textAlign: 'left',
                      fontWeight: isSelected ? 'bold' : '500',
                      color: isSelected ? '#7B5233' : '#1e293b',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>B{step.step_number}: {step.name.substring(0, 16)}</span>
                    {isQC && <span style={{ fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: 'bold' }}>QC</span>}
                  </button>
                );
              })}
            </div>

            {/* Cột phải: Form cấu hình checklist động */}
            {formData.steps[selectedStepForChecklist] ? (
              <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#7B5233', fontWeight: 'bold' }}>Cấu hình Checklist: Bước {formData.steps[selectedStepForChecklist].step_number}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Các trường này sẽ tự động hiển thị trên Mobile khi QC kiểm tra bước này</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddChecklistItem(selectedStepForChecklist)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      border: '1px solid #7B5233',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    + Thêm tiêu chí kiểm tra
                  </button>
                </div>

                {(!formData.steps[selectedStepForChecklist].checklist || formData.steps[selectedStepForChecklist].checklist.length === 0) ? (
                  <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8' }}>
                    <ListPlus size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Chưa có checklist kiểm tra nào được gán cho bước này</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem' }}>Vui lòng nhấn nút ở trên để tạo biểu mẫu kiểm tra QC</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.steps[selectedStepForChecklist].checklist.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        style={{
                          border: '1px solid #EADCC9',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          backgroundColor: '#fdfcfb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        {/* Cột 1: Tên tiêu chí */}
                        <div style={{ flex: 2, minWidth: '150px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tên tiêu chí kiểm tra</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateChecklistItem(selectedStepForChecklist, itemIdx, 'name', e.target.value)}
                            placeholder="Ví dụ: Kiểm tra độ ẩm gỗ, Đo chiều dày..."
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Cột 2: Hình thức */}
                        <div style={{ flex: 1.5, minWidth: '110px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Hình thức kiểm tra</label>
                          <input
                            type="text"
                            value={item.method}
                            onChange={(e) => handleUpdateChecklistItem(selectedStepForChecklist, itemIdx, 'method', e.target.value)}
                            placeholder="Ví dụ: Dùng mắt, Dùng thước cặp..."
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Cột 3: Định dạng kết quả */}
                        <div style={{ width: '110px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Định dạng KQ</label>
                          <select
                            value={item.result_type}
                            onChange={(e) => handleUpdateChecklistItem(selectedStepForChecklist, itemIdx, 'result_type', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'white' }}
                          >
                            <option value="pass_fail">Đạt / Không đạt</option>
                            <option value="number">Số đo đo đạc</option>
                            <option value="text">Ghi chú văn bản</option>
                          </select>
                        </div>

                        {/* Cột 4: Mức độ nghiêm trọng */}
                        <div style={{ width: '90px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Mức độ lỗi</label>
                          <select
                            value={item.critical_level}
                            onChange={(e) => handleUpdateChecklistItem(selectedStepForChecklist, itemIdx, 'critical_level', e.target.value)}
                            style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: 'white' }}
                          >
                            <option value="Critical">Critical</option>
                            <option value="Major">Major</option>
                            <option value="Minor">Minor</option>
                          </select>
                        </div>

                        {/* Cột 5: Bắt buộc chụp ảnh */}
                        <div style={{ width: '70px', textAlign: 'center' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Chụp ảnh</label>
                          <input
                            type="checkbox"
                            checked={item.required_image}
                            onChange={(e) => handleUpdateChecklistItem(selectedStepForChecklist, itemIdx, 'required_image', e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>

                        {/* Cột 6: Xoá */}
                        <div style={{ width: '30px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(selectedStepForChecklist, itemIdx)}
                            style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', marginTop: '16px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, padding: '40px', textAlign: 'center', color: '#cbd5e1' }}>Vui lòng thêm các bước quy trình trước</div>
            )}
          </div>
        )}

      </div>

      {editingCell && (
        <div style={{
          position: 'fixed',
          top: editingCell.rect.top,
          left: editingCell.rect.left,
          width: editingCell.rect.width,
          height: editingCell.rect.height,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          {editingCell.field === 'assignee_role' ? (
            <select
              autoFocus
              value={editingCell.value}
              onChange={(e) => {
                const newVal = e.target.value;
                setEditingCell({ ...editingCell, value: newVal });
                handleUpdateStep(editingCell.stepIndex, 'assignee_role', newVal);
              }}
              onBlur={() => setEditingCell(null)}
              style={{ width: '100%', height: '100%', padding: '2px', fontSize: '11px', border: '1px solid #7B5233', outline: 'none', borderRadius: '4px' }}
            >
              <option value="Kho">Bộ phận Kho</option>
              <option value="QC">Bộ phận QC / QLCL</option>
              <option value="Sản xuất">Bộ phận Sản xuất</option>
              <option value="Thu mua">Bộ phận Thu mua</option>
              <option value="Bán hàng">Bộ phận Bán hàng / KD</option>
              <option value="Admin">Ban Giám Đốc / Admin</option>
            </select>
          ) : (
            <input
              autoFocus
              type="text"
              value={editingCell.value}
              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
              onBlur={() => {
                handleUpdateStep(editingCell.stepIndex, editingCell.field, editingCell.value);
                setEditingCell(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateStep(editingCell.stepIndex, editingCell.field, editingCell.value);
                  setEditingCell(null);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              style={{ width: '100%', height: '100%', padding: '2px 6px', fontSize: '11px', border: '1px solid #7B5233', outline: 'none', borderRadius: '4px' }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ISOFormEditorView;
