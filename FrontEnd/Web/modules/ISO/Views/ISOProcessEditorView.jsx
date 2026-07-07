import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle, AlertCircle, 
  ListPlus, Settings, FileText, Activity, Download, Upload, HelpCircle, Eye,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, Quote, Link, Image, Grid, Smile, Undo, Redo,
  ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';
import '@styles/components.css';

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

  const handleColorChange = (e, command) => {
    document.execCommand(command, false, e.target.value);
    handleInput();
  };

  const insertLink = (e) => {
    e.preventDefault();
    const url = prompt("Nhập đường dẫn URL:");
    if (url) {
      document.execCommand('createLink', false, url);
      handleInput();
    }
  };

  const insertImage = (e) => {
    e.preventDefault();
    const url = prompt("Nhập URL của ảnh:");
    if (url) {
      document.execCommand('insertImage', false, url);
      handleInput();
    }
  };

  const insertTable = (e) => {
    e.preventDefault();
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.85rem;" border="1">
        <thead>
          <tr style="background-color: #FAF6F0; border: 1px solid #7B5233;">
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 1</th>
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 2</th>
            <th style="padding: 8px; border: 1px solid #7B5233; text-align: left; font-weight: bold;">Tiêu đề 3</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border: 1px solid #EADCC9;">
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 1</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 2</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 3</td>
          </tr>
          <tr style="border: 1px solid #EADCC9;">
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 4</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 5</td>
            <td style="padding: 8px; border: 1px solid #EADCC9;">Dữ liệu 6</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#475569',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  };

  const selectStyle = {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    color: '#334155',
    backgroundColor: 'white',
    outline: 'none',
    cursor: 'pointer',
    height: '32px'
  };

  const dividerStyle = {
    width: '1px',
    height: '20px',
    backgroundColor: '#e2e8f0',
    margin: '0 4px',
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', display: 'flex', flexDirection: 'column', ...style }}>
      {/* Modern Ribbon/Excel toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        alignItems: 'center',
        userSelect: 'none'
      }}>
        {/* Paragraph Block Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'formatBlock', e.target.value)}
          defaultValue="p"
          style={{ ...selectStyle, width: '110px' }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="pre">Code Block</option>
        </select>

        {/* Font Family Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'fontName', e.target.value)}
          defaultValue="Times New Roman"
          style={{ ...selectStyle, width: '130px' }}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>

        {/* Font Size Selection */}
        <select 
          onChange={(e) => executeCommand(e, 'fontSize', e.target.value)}
          defaultValue="3"
          style={{ ...selectStyle, width: '56px' }}
        >
          <option value="1">10</option>
          <option value="2">12</option>
          <option value="3">14</option>
          <option value="4">16</option>
          <option value="5">18</option>
          <option value="6">24</option>
          <option value="7">32</option>
        </select>

        <span style={dividerStyle} />

        {/* Basic styles */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'bold')} style={btnStyle} title="Đậm (B)">
          <Bold size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'italic')} style={btnStyle} title="Nghiêng (I)">
          <Italic size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'underline')} style={btnStyle} title="Gạch chân (U)">
          <Underline size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'strikeThrough')} style={btnStyle} title="Gạch ngang (S)">
          <Strikethrough size={15} />
        </button>

        {/* Color picker */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '28px', height: '28px', cursor: 'pointer' }} title="Màu chữ">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1', color: '#334155' }}>A</span>
            <div style={{ width: '12px', height: '3px', backgroundColor: '#e11d48', marginTop: '1px' }} />
          </div>
          <input 
            type="color" 
            onChange={(e) => handleColorChange(e, 'foreColor')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }} 
          />
        </div>

        {/* Highlight Color */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '28px', height: '28px', cursor: 'pointer' }} title="Tô màu nền chữ">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1', color: '#334155' }}>✎</span>
            <div style={{ width: '12px', height: '3px', backgroundColor: '#eab308', marginTop: '1px' }} />
          </div>
          <input 
            type="color" 
            onChange={(e) => handleColorChange(e, 'backColor')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }} 
          />
        </div>

        <span style={dividerStyle} />

        {/* Lists */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')} style={btnStyle} title="Danh sách ký hiệu">
          <List size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertOrderedList')} style={btnStyle} title="Danh sách số">
          <ListOrdered size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Alignments */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyLeft')} style={btnStyle} title="Căn trái">
          <AlignLeft size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyCenter')} style={btnStyle} title="Căn giữa">
          <AlignCenter size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyRight')} style={btnStyle} title="Căn phải">
          <AlignRight size={16} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'justifyFull')} style={btnStyle} title="Căn đều">
          <AlignJustify size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Quote & Inserts */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'formatBlock', 'blockquote')} style={btnStyle} title="Trích dẫn">
          <Quote size={15} />
        </button>
        <button type="button" onMouseDown={insertLink} style={btnStyle} title="Chèn liên kết">
          <Link size={15} />
        </button>
        <button type="button" onMouseDown={insertImage} style={btnStyle} title="Chèn ảnh">
          <Image size={15} />
        </button>
        <button type="button" onMouseDown={insertTable} style={btnStyle} title="Chèn bảng">
          <Grid size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'insertHTML', '😊')} style={btnStyle} title="Emoji">
          <Smile size={16} />
        </button>

        <span style={dividerStyle} />

        {/* Undo/Redo */}
        <button type="button" onMouseDown={(e) => executeCommand(e, 'undo')} style={btnStyle} title="Hoàn tác">
          <Undo size={15} />
        </button>
        <button type="button" onMouseDown={(e) => executeCommand(e, 'redo')} style={btnStyle} title="Làm lại">
          <Redo size={15} />
        </button>
      </div>

      {/* Editor Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{
          minHeight: '260px',
          padding: '16px 20px',
          outline: 'none',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#1e293b',
          overflowY: 'auto'
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

const generateNextQTCode = async (isProcess) => {
  try {
    const url = isProcess ? '/iso-documents/processes' : '/iso-documents';
    const items = await api.get(url);
    let maxNum = 0;
    items.forEach(item => {
      if (item.code) {
        const match = item.code.match(/G7\.CL\s*-QT(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    const nextNum = maxNum + 1;
    const formattedNum = nextNum < 10 ? `0${nextNum}` : String(nextNum);
    return `G7.CL -QT${formattedNum}`;
  } catch (error) {
    console.error("Lỗi khi sinh mã tự động:", error);
    return 'G7.CL -QT01';
  }
};

// ─── Render Custom Outcome Node Helper ──────────────────────────────────────────
const renderCustomOutcomeNode = (id, type, name, isNoBranch) => {
  const isDecision = type === 'decision';
  const isTask = type === 'task';
  const isTerminal = type === 'terminal' || !type;

  let bg = '';
  let border = '';
  let color = '';
  let shadow = '';
  let borderRadius = '6px';
  let width = '120px';
  let height = '45px';
  let padding = '6px 12px';

  if (isNoBranch) {
    bg = isDecision ? '#FFFBEB' : (isTask ? '#F8FAFC' : 'linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%)');
    border = isDecision ? '1.5px solid #d97706' : (isTask ? '1.5px solid #cbd5e1' : '1.5px solid #FEB2B2');
    color = isDecision ? '#b45309' : (isTask ? '#334155' : '#C53030');
    shadow = isDecision ? '0 4px 10px rgba(217, 119, 6, 0.1)' : (isTask ? '0 2px 4px rgba(0,0,0,0.02)' : '0 4px 10px rgba(229, 62, 62, 0.12)');
  } else {
    bg = isDecision ? '#FFFBEB' : (isTask ? '#F8FAFC' : 'linear-gradient(135deg, #F0FDF4 0%, #C6F6D5 100%)');
    border = isDecision ? '1.5px solid #d97706' : (isTask ? '1.5px solid #cbd5e1' : '1.5px solid #9AE6B4');
    color = isDecision ? '#b45309' : (isTask ? '#334155' : '#22543D');
    shadow = isDecision ? '0 4px 10px rgba(217, 119, 6, 0.1)' : (isTask ? '0 2px 4px rgba(0,0,0,0.02)' : '0 4px 10px rgba(72, 187, 120, 0.12)');
  }

  if (isTerminal) {
    borderRadius = '20px';
  } else if (isDecision) {
    width = '80px';
    height = '80px';
    borderRadius = '4px';
  }

  const icon = isNoBranch ? '🛑 ' : '✅ ';

  return (
    <div 
      id={id}
      style={{
        position: 'absolute',
        left: isNoBranch ? (isDecision ? '-125px' : '-165px') : 'auto',
        right: !isNoBranch ? (isDecision ? '-125px' : '-165px') : 'auto',
        top: isDecision ? '30px' : '54px',
        width: width,
        height: height,
        padding: padding,
        background: bg,
        border: border,
        borderRadius: borderRadius,
        boxShadow: shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isDecision ? 'rotate(45deg)' : 'none',
        zIndex: 10
      }}
    >
      <div style={{ transform: isDecision ? 'rotate(-45deg)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: color, textAlign: 'center', wordBreak: 'break-word', lineHeight: '1.2' }}>
          {!isDecision && icon}{name}
        </span>
      </div>
    </div>
  );
};

// ─── Flowchart Connectors Component (Dynamic DOM-based SVG Drawing) ──────────
const FlowchartConnectors = ({ steps, zoomScale }) => {
  const [paths, setPaths] = useState([]);
  const requestRef = useRef();

  const updatePaths = useCallback(() => {
    const container = document.getElementById("flowchart-canvas-container");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newPaths = [];

    steps.forEach((step, idx) => {
      if (step.node_type === 'decision') {
        const sourceEl = document.getElementById(`step-card-${step.step_number}`);
        if (!sourceEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const scale = zoomScale || 1.0;
        
        const getRelativeRect = (rect) => {
          return {
            left: (rect.left - containerRect.left) / scale,
            top: (rect.top - containerRect.top) / scale,
            width: rect.width / scale,
            height: rect.height / scale
          };
        };

        const source = getRelativeRect(sourceRect);

        // A. No Path (Fail Path) - skip SVG for horizontal inline chains
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum) {
          const targetEl = document.getElementById(`step-card-${noStepNum}`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const target = getRelativeRect(targetRect);

            const startX = source.left;
            const startY = source.top + source.height / 2;
            const endX = target.left + target.width;
            const endY = target.top + target.height / 2;

            const isHorizontal = Math.abs(startY - endY) < 40;

            // Only draw SVG when target is NOT in same row (inline CSS arrows handle horizontal)
            if (!isHorizontal) {
              const offset = 55; 
              const pathD = `M ${startX} ${startY} H ${startX - offset} V ${endY} H ${target.left}`;

              newPaths.push({
                key: `no-${step.step_number}-${noStepNum}`,
                d: pathD,
                color: '#ef4444',
                label: 'Sai (No)',
                startX,
                startY,
                arrowX: target.left,
                arrowY: endY,
                arrowDirection: 'right'
              });
            }
          }
        } else if (failPath[0] && failPath[0].name) {
          const targetEl = document.getElementById(`step-card-${step.step_number}-custom-fail`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const target = getRelativeRect(targetRect);

            const startX = source.left;
            const startY = source.top + source.height / 2;
            const endX = target.left + target.width;
            const endY = target.top + target.height / 2;

            const pathD = `M ${startX} ${startY} H ${endX}`;

            newPaths.push({
              key: `no-custom-${step.step_number}`,
              d: pathD,
              color: '#ef4444',
              label: 'Sai (No)',
              startX,
              startY,
              arrowX: endX,
              arrowY: endY,
              arrowDirection: 'left'
            });
          }
        }

        // B. Yes Path - use visual position check instead of step_number+1
        const yesStepNum = step.transition?.next_step;
        if (yesStepNum) {
          const targetEl = document.getElementById(`step-card-${yesStepNum}`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const target = getRelativeRect(targetRect);

            const startX = source.left + source.width;
            const startY = source.top + source.height / 2;
            const endX = target.left + target.width;
            const endY = target.top + target.height / 2;

            // Check if target is visually directly below the source (sequential flow)
            const sourceCenterX = source.left + source.width / 2;
            const targetCenterX = target.left + target.width / 2;
            const isDirectlyBelow = endY > startY && Math.abs(sourceCenterX - targetCenterX) < 150;
            
            if (!isDirectlyBelow) {
              const offset = 55;
              const pathD = `M ${startX} ${startY} H ${startX + offset} V ${endY} H ${endX}`;

              newPaths.push({
                key: `yes-${step.step_number}-${yesStepNum}`,
                d: pathD,
                color: '#22c55e',
                label: 'Đúng (Yes)',
                startX,
                startY,
                arrowX: endX,
                arrowY: endY,
                arrowDirection: 'left'
              });
            }
          }
        } else if (step.transition && step.transition.next_step === null && step.transition.name) {
          // Link to custom outcome card next to the diamond
          const targetEl = document.getElementById(`step-card-${step.step_number}-custom-yes`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const target = getRelativeRect(targetRect);

            const startX = source.left + source.width;
            const startY = source.top + source.height / 2;
            const endX = target.left;
            const endY = target.top + target.height / 2;

            // Green arrow line going straight to the right
            const pathD = `M ${startX} ${startY} H ${endX}`;

            newPaths.push({
              key: `yes-custom-${step.step_number}`,
              d: pathD,
              color: '#22c55e',
              label: 'Đúng (Yes)',
              startX,
              startY,
              arrowX: endX,
              arrowY: endY,
              arrowDirection: 'right'
            });
          }
        }
      }
    });

    setPaths(newPaths);
  }, [steps, zoomScale]);

  useEffect(() => {
    // Recalculate multiple times to ensure DOM is settled
    const handler = () => {
      updatePaths();
    };
    
    // Initial run
    handler();
    
    // Deferred run
    const timer = setTimeout(handler, 100);
    const timer2 = setTimeout(handler, 300);
    
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', handler);
    };
  }, [steps, zoomScale, updatePaths]);

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      {paths.map((p) => {
        let points = "";
        if (p.arrowDirection === 'right') {
          points = `${p.arrowX},${p.arrowY} ${p.arrowX - 8},${p.arrowY - 5} ${p.arrowX - 8},${p.arrowY + 5}`;
        } else {
          points = `${p.arrowX},${p.arrowY} ${p.arrowX + 8},${p.arrowY - 5} ${p.arrowX + 8},${p.arrowY + 5}`;
        }

        return (
          <g key={p.key}>
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points={points}
              fill={p.color}
            />
            {p.startX !== undefined && p.startY !== undefined && (() => {
              const isNo = p.label === 'Sai (No)';
              const textX = isNo ? p.startX - 30 : p.startX + 30;
              const textY = p.startY + 3;
              const rectWidth = isNo ? 20 : 22;
              return (
                <g>
                  <rect
                    x={textX - rectWidth / 2}
                    y={p.startY - 6}
                    width={rectWidth}
                    height={12}
                    fill="white"
                    rx="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill={p.color}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    style={{ userSelect: 'none' }}
                  >
                    {isNo ? 'No' : 'Yes'}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
};

const ISOProcessEditorView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isProcessMode = true;
  const backPath = isProcessMode ? '/admin/iso-processes' : '/admin/iso-documents';
  const isEditMode = id && id !== 'new';

  // Screen routing states: 'overview' (Màn hình 1), 'step_instructions' (Ảnh 4)
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activeMenu, setActiveMenu] = useState('Mục đích'); 
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);

  // Accordion collapsed states - initialized to false (collapsed) by default
  const [stepsAccordionExpanded, setStepsAccordionExpanded] = useState(false);
  const [historyAccordionExpanded, setHistoryAccordionExpanded] = useState(false);

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
    folder: '', // display_at
    doc_type: '', // note
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {
      'Mục đích': '',
      'Phạm vi áp dụng': '',
      'Tài liệu viện dẫn': '',
      'Định nghĩa và viết tắt': '',
      'Nội dung': '',
      'Biểu mẫu': ''
    },
    section_types: {
      'Mục đích': 'text',
      'Phạm vi áp dụng': 'text',
      'Tài liệu viện dẫn': 'text',
      'Định nghĩa và viết tắt': 'text',
      'Nội dung': isProcessMode ? 'flowchart' : 'text',
      'Biểu mẫu': 'text'
    },
    steps: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Get all sidestep numbers that are in a No-branch chain
  const getSidestepsInfo = () => {
    const sidesteps = new Set();
    const parentToChild = {};
    
    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum) {
          sidesteps.add(noStepNum);
          parentToChild[step.step_number] = noStepNum;
          
          let current = noStepNum;
          while (current) {
            const currStep = formData.steps.find(s => s.step_number === current);
            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && next !== current && !formData.steps.some(s => s.step_number === next && s.node_type === 'decision')) {
              sidesteps.add(next);
              parentToChild[current] = next;
              current = next;
            } else {
              break;
            }
          }
        }
      }
    });
    return { sidesteps, parentToChild };
  };

  const { sidesteps: sidestepSet } = getSidestepsInfo();

  // Calculate maximum No-branch horizontal chain length to adjust canvas padding
  const getMaxLeftChainLength = () => {
    let maxLen = 0;
    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;
        let len = 0;
        const visited = new Set();
        while (current && !visited.has(current)) {
          visited.add(current);
          len++;
          const currStep = formData.steps.find(s => s.step_number === current);
          current = currStep?.transition?.next_step || currStep?.next_step;
        }
        if (len > maxLen) maxLen = len;
      }
    });
    return maxLen;
  };
  const maxLeftChainLength = getMaxLeftChainLength();

  const getStepDisplayLabels = () => {
    const labels = {};
    const mainSteps = (formData.steps || []).filter(s => !sidestepSet.has(s.step_number));
    
    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      labels[step.step_number] = `B${mainNum}`;
    });
    
    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;
        
        // Use the parent decision step's main number (mainNum) as the prefix
        const prefixNum = mainNum;
        
        const visited = new Set();
        let subIdx = 1;
        while (current && !visited.has(current)) {
          visited.add(current);
          const currStep = formData.steps.find(s => s.step_number === current);
          if (currStep) {
            labels[currStep.step_number] = `B${prefixNum}.${subIdx}`;
            subIdx++;
            current = currStep.transition?.next_step || currStep.next_step;
            if (mainSteps.some(ms => ms.step_number === current)) {
              break;
            }
          } else {
            break;
          }
        }
      }
    });
    return labels;
  };
  
  const stepDisplayLabels = getStepDisplayLabels();

  // Handle drag-to-scroll (pan) in the flowchart viewport canvas
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    
    // Ignore interactive element clicks
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'button' || tagName === 'input' || tagName === 'select' || tagName === 'option' || e.target.closest('button')) {
      return;
    }

    const container = e.currentTarget;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      container.scrollLeft = scrollLeft - dx;
      container.scrollTop = scrollTop - dy;
    };

    const handleMouseUp = () => {
      container.style.cursor = 'grab';
      container.style.removeProperty('user-select');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Auto-synchronize default step names with their dynamic labels
  useEffect(() => {
    let changed = false;
    const newSteps = (formData.steps || []).map(step => {
      const label = stepDisplayLabels[step.step_number];
      if (label) {
        const cleanNum = label.substring(1); // e.g. "2.1"
        const expectedDefaultName = `Bước mới ${cleanNum}`;
        if (step.name && step.name.startsWith("Bước mới") && step.name !== expectedDefaultName) {
          changed = true;
          return { ...step, name: expectedDefaultName };
        }
      }
      return step;
    });
    if (changed) {
      setFormData(prev => ({ ...prev, steps: newSteps }));
    }
  }, [formData.steps, stepDisplayLabels]);

  // Helper to render a single step card UI cleanly
  const renderSingleStepCard = (step, idx) => {
    const isSelected = selectedStepIdx === idx;
    const isDecision = step.node_type === 'decision';
    const isCondition = step.node_type === 'condition';
    const isTerminal = step.node_type === 'terminal';
    
    let cardBg = 'white';
    let cardBorder = '1px solid #cbd5e1';
    let cardRadius = '6px';
    let cardPadding = '12px 16px';
    let shapeIcon = '📄';

    if (isTerminal) {
      cardBg = '#F0FDF4';
      cardBorder = '1.5px solid #16a34a';
      cardRadius = '24px';
      shapeIcon = '🏁';
    } else if (isDecision) {
      cardBg = '#FFFBEB';
      cardBorder = '1.5px solid #d97706';
      cardRadius = '8px';
      shapeIcon = '🔶';
    } else if (isCondition) {
      cardBg = '#FAF5FF';
      cardBorder = '1.5px solid #7c3aed';
      cardRadius = '8px';
      shapeIcon = '☶';
    }

    if (isDecision || isCondition) {
      return (
        <div id={`step-card-${step.step_number}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Custom Outcome Cards (beside the diamond) */}
          {isDecision && getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step === null || getStepFailPath(step)[0].return_to_step === undefined) && 
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-fail`,
              getStepFailPath(step)[0].node_type || 'terminal',
              getStepFailPath(step)[0].name || 'Hủy bỏ',
              true
            )
          }

          {isDecision && step.transition && step.transition.next_step === null && 
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-yes`,
              step.transition.node_type || 'terminal',
              step.transition.name || 'Hoàn tất',
              false
            )
          }
          <div
            onClick={() => setSelectedStepIdx(idx)}
            style={{
              width: '140px',
              height: '140px',
              transform: 'rotate(45deg)',
              backgroundColor: isSelected ? '#FAF6F0' : cardBg,
              border: isSelected ? '2px solid #7B5233' : cardBorder,
              cursor: 'pointer',
              boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '12px 0'
            }}
          >
            {/* Content rotated back -45deg */}
            <div style={{
              transform: 'rotate(-45deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              width: '110px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.62rem', backgroundColor: isSelected ? '#7B5233' : (isDecision ? '#d97706' : '#7c3aed'), color: 'white', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
                {step.assignee_role && (
                  <span style={{ fontSize: '0.55rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
                )}
              </div>
              
              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#1e293b', lineBreak: 'anywhere', maxWidth: '100px' }}>
                {step.name}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '2px' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>

          {isCondition && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.68rem', color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginTop: '-4px', marginBottom: '4px' }}>
              <div>➔ Nhánh 1: B3</div>
              <div>➔ Nhánh 2: B4</div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          id={`step-card-${step.step_number}`}
          onClick={() => setSelectedStepIdx(idx)}
          style={{
            width: '240px',
            backgroundColor: isSelected ? '#FAF6F0' : cardBg,
            border: isSelected ? '2px solid #7B5233' : cardBorder,
            borderRadius: cardRadius,
            padding: cardPadding,
            cursor: 'pointer',
            boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s ease',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem' }}>{shapeIcon}</span>
              <span style={{ fontSize: '0.7rem', backgroundColor: isSelected ? '#7B5233' : '#64748b', color: 'white', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
              {step.assignee_role && (
                <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
              style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1e293b' }}>
            {step.name}
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    setCustomTitle('G7 - Smart Flow');
    if (isProcessMode) {
      setCustomSubtitle(isEditMode ? 'Thiết lập & Cấu hình Quy trình ISO' : 'Thêm mới Quy trình & Checklist ISO');
      setCustomScreenCode(isEditMode ? 'ISO-PROC-EDIT' : 'ISO-PROC-CREATE');
    } else {
      setCustomSubtitle(isEditMode ? 'Chỉnh sửa Mẫu ISO' : 'Thêm mới Mẫu ISO');
      setCustomScreenCode(isEditMode ? 'ISO-DOC-EDIT' : 'ISO-DOC-CREATE');
    }

    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      generateNextQTCode(isProcessMode).then(nextCode => {
        setFormData({
          id: null,
          code: nextCode,
          name: parsed.name || '',
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          issuer: '',
          editor: '',
          approver: '',
          owner: '',
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiệu lực',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
            { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
          ],
          sections: {
            'Mục đích': isProcessMode ? (parsed.sections?.['Mục đích'] || '') : '',
            'Phạm vi áp dụng': isProcessMode ? (parsed.sections?.['Phạm vi áp dụng'] || '') : '',
            'Tài liệu viện dẫn': isProcessMode ? (parsed.sections?.['Tài liệu viện dẫn'] || '') : '',
            'Định nghĩa và viết tắt': isProcessMode ? (parsed.sections?.['Định nghĩa và viết tắt'] || parsed.sections?.['Định nghĩa và Từ viết tắt'] || '') : '',
            'Nội dung': isProcessMode ? (parsed.sections?.['Nội dung'] || parsed.sections?.['Nội dung quy trình'] || '') : '',
            'Biểu mẫu': isProcessMode ? (parsed.sections?.['Biểu mẫu'] || '') : ''
          },
          section_types: {
            'Mục đích': 'text',
            'Phạm vi áp dụng': 'text',
            'Tài liệu viện dẫn': 'text',
            'Định nghĩa và viết tắt': 'text',
            'Nội dung': isProcessMode ? 'flowchart' : 'text',
            'Biểu mẫu': 'text'
          },
          steps: (parsed.steps || []).map(step => ({
            ...step,
            node_type: step.transition?.node_type || step.node_type || 'task',
            has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
            fail_path: step.transition?.fail_path || step.fail_path || [],
            image_url: step.transition?.image_url || ''
          }))
        });
      });
      showFeedback('success', 'Đã bóc tách tự động dữ liệu từ file Word thành công!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      generateNextQTCode(isProcessMode).then(nextCode => {
        setFormData(prev => ({
          ...prev,
          code: nextCode
        }));
      });
    }
  }, [id]);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const url = isProcessMode ? `/iso-documents/processes/${id}/details` : `/iso-documents/${id}/details`;
      const data = await api.get(url);
      
      const receivedSections = { ...(data.sections || {}) };
      let sectionTypes = {
        'Mục đích': 'text',
        'Phạm vi áp dụng': 'text',
        'Tài liệu viện dẫn': 'text',
        'Định nghĩa và viết tắt': 'text',
        'Nội dung': isProcessMode ? 'flowchart' : 'text',
        'Biểu mẫu': 'text'
      };

      if (receivedSections['__metadata_section_types__']) {
        try {
          sectionTypes = JSON.parse(receivedSections['__metadata_section_types__']);
        } catch (e) {
          console.error('Error parsing section types metadata:', e);
        }
        delete receivedSections['__metadata_section_types__'];
      }

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
        folder: data.folder || data.display_at || '', 
        doc_type: data.doc_type || data.notes || '', 
        revision_logs: data.revision_logs || [],
        iso_document_id: data.iso_document_id || '',
        owner: data.owner || '',
        editor: data.editor || '',
        sections: {
          'Mục đích': receivedSections['Mục đích'] || '',
          'Phạm vi áp dụng': receivedSections['Phạm vi áp dụng'] || '',
          'Tài liệu viện dẫn': receivedSections['Tài liệu viện dẫn'] || '',
          'Định nghĩa và viết tắt': receivedSections['Định nghĩa và viết tắt'] || receivedSections['Định nghĩa và Từ viết tắt'] || '',
          'Nội dung': receivedSections['Nội dung'] || receivedSections['Nội dung quy trình'] || '',
          'Biểu mẫu': receivedSections['Biểu mẫu'] || ''
        },
        section_types: sectionTypes,
        steps: (data.steps || []).map(step => ({
          ...step,
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || [],
          image_url: step.transition?.image_url || ''
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

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSectionChange = (sectionName, val) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: val
      }
    }));
  };

  // --- QC STEPS CONFIGURATION ---
  const handleAddStep = () => {
    const nextStepNum = formData.steps.length + 1;
    const newStep = {
      step_number: nextStepNum,
      name: `Bước mới ${nextStepNum}`,
      assignee_role: 'QC',
      instructions: '',
      checklist: [],
      transition: { next_step: nextStepNum + 1, image_url: '' },
      flow_node_id: `node_${nextStepNum}`,
      node_type: 'task',
      has_branch: false,
      image_url: ''
    };
    
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
    
    setSelectedStepIdx(nextStepNum - 1);
  };

  const getStepFailPath = (step) => {
    if (!step) return [];
    if (step.fail_path && step.fail_path.length > 0) {
      return step.fail_path;
    }
    if (step.has_branch === true) {
      const defaultRole = step.assignee_role || 'QC';
      return [
        { name: "Cập nhật báo cáo thông tin", assignee_role: defaultRole, edge_label: "Không", return_to_step: null }
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
        if (currentPath[nodeIdx]) {
          currentPath[nodeIdx] = { ...currentPath[nodeIdx], name: val };
        }
        nextSteps[index] = { ...nextSteps[index], fail_path: currentPath };
      } else {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => {
      const nextSteps = prev.steps.filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1, flow_node_id: `node_${idx + 1}` }));
      return { ...prev, steps: nextSteps };
    });
    if (selectedStepIdx >= formData.steps.length - 1) {
      setSelectedStepIdx(Math.max(0, formData.steps.length - 2));
    }
  };

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

  const handleAddStepFromCanvas = useCallback((nodeType, position) => {
    setFormData(prev => {
      const nextStepNum = prev.steps.length + 1;
      const newStep = {
        step_number: nextStepNum,
        name: nodeType === 'decision' ? `Kiểm tra ${nextStepNum}` : nodeType === 'terminal' ? `Kết thúc` : `Bước mới ${nextStepNum}`,
        assignee_role: 'QC',
        instructions: '',
        checklist: [],
        transition: { next_step: nextStepNum + 1, image_url: '' },
        flow_node_id: `node_${nextStepNum}`,
        node_type: nodeType,
        has_branch: false,
        fail_path: [],
        x_pos: position.x,
        y_pos: position.y,
        image_url: ''
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
    setSelectedStepIdx(formData.steps.length);
  }, [formData.steps]);

  const handleNodeSelect = useCallback((stepNumber) => {
    const idx = formData.steps.findIndex(s => s.step_number === stepNumber);
    if (idx >= 0) {
      setSelectedStepIdx(idx);
    }
  }, [formData.steps]);

  const handleImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const triggerDownload = () => {
    alert("Đang khởi tạo tải xuống tài liệu quy trình dạng PDF/Word...");
  };

  // --- SAVE FORM ---
  const handleSaveForm = async () => {
    if (!formData.code || !formData.name) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Mã quy trình và Tên quy trình');
      return;
    }

    setLoading(true);
    try {
      const nodes = [];
      const links = [];

      formData.steps.forEach((step, idx) => {
        let nodeType = step.node_type || 'task';
        nodes.push({
          id: step.flow_node_id,
          label: `B${step.step_number}: ${step.name}`,
          type: nodeType,
          role: step.assignee_role,
          x: step.x_pos || 250,
          y: step.y_pos || (80 + idx * 120)
        });

        if (idx > 0) {
          links.push({
            from: formData.steps[idx-1].flow_node_id,
            to: step.flow_node_id,
            label: 'Đạt'
          });
        }
      });

      const stepsToSave = formData.steps.map(step => {
        const nextTransition = {
          ...(step.transition || {}),
          node_type: step.node_type || 'task',
          has_branch: step.has_branch || false,
          fail_path: getStepFailPath(step),
          image_url: step.image_url || ''
        };
        return {
          ...step,
          transition: nextTransition
        };
      });

      const finalPayload = {
        ...formData,
        display_at: formData.folder,
        notes: formData.doc_type,
        steps: stepsToSave,
        diagram_data: JSON.stringify({ nodes, links }),
        sections: {
          ...(formData.sections || {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {})
        }
      };

      const url = isProcessMode ? '/iso-documents/processes/save' : '/iso-documents/save';
      const res = await api.post(url, finalPayload);
      showFeedback('success', res.message || 'Lưu tài liệu quy trình ISO thành công!');
      
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

  // Card panel style helpers
  const cardBorderColor = '#7B5233';
  const headerBgColor = '#FAF6F0';
  const accentColor = '#7B5233';

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: `1.5px solid ${cardBorderColor}`,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(123, 82, 51, 0.02)',
    marginBottom: '16px'
  };

  const headerStyle = {
    backgroundColor: headerBgColor,
    padding: '10px 14px',
    borderBottom: `1.5px solid ${cardBorderColor}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  };

  const headerTextStyle = {
    fontWeight: 'bold',
    color: accentColor,
    fontSize: '0.84rem',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ 
      fontFamily: 'Inter, sans-serif', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px', 
      padding: '16px',
      color: '#2D1A12',
      backgroundColor: '#FAF8F5',
      minHeight: '100vh',
      width: '100%' 
    }}>
      
      {/* Top Action bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)',
        width: '100%'
      }}>
        {currentScreen !== 'overview' ? (
          <button
            onClick={() => setCurrentScreen('overview')}
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
            <ArrowLeft size={16} /> Quay lại trang thông tin
          </button>
        ) : (
          <div /> 
        )}

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
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(123, 82, 51, 0.1)'
          }}
        >
          <Save size={16} /> {loading ? 'Đang lưu...' : (isProcessMode ? 'Lưu quy trình' : 'Lưu Mẫu ISO')}
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
          color: message.type === 'success' ? '#137333' : '#c5221f',
          border: `1px solid ${message.type === 'success' ? '#137333' : '#c5221f'}`,
          width: '100%'
        }}>
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* --- SCREEN 1: OVERVIEW SCREEN (Màn hình chính) --- */}
      {currentScreen === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
          
          {/* Card: Thông tin quy trình - Luôn luôn mở và không thể đóng */}
          <div style={cardStyle}>
            <div style={{ ...headerStyle, cursor: 'default' }}>
              <span style={headerTextStyle}>{isProcessMode ? 'Thông tin quy trình' : 'Thông tin Mẫu ISO'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={triggerDownload}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#7B5233',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Tải xuống
                </button>
              </div>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #EADCC9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>{isProcessMode ? 'Mã QT' : 'Mã Mẫu'}</label>
                  <input type="text" value={formData.code} onChange={(e) => handleInputChange('code', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>{isProcessMode ? 'Tên quy trình' : 'Tên Mẫu ISO'}</label>
                  <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái</label>
                  <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}>
                    <option value="Hiệu lực">Đang hoạt động</option>
                    <option value="Hết hiệu lực">Hết hiệu lực</option>
                    <option value="Dự thảo">Dự thảo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Người soạn</label>
                  <input type="text" value={formData.issuer || formData.editor} onChange={(e) => handleInputChange(isProcessMode ? 'editor' : 'issuer', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Người duyệt</label>
                  <input type="text" value={formData.approver} onChange={(e) => handleInputChange('approver', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày ban hành</label>
                  <input type="date" value={formData.issue_date} onChange={(e) => handleInputChange('issue_date', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hiển thị tại</label>
                  <input type="text" value={formData.folder} onChange={(e) => handleInputChange('folder', e.target.value)} placeholder="Màn hình hiển thị..." style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ghi chú</label>
                <textarea value={formData.doc_type} onChange={(e) => handleInputChange('doc_type', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Card: Nội dung quy trình - Hiển thị trực tiếp split view left TOC + right editor/flowchart (Ảnh 2) */}
          <div style={cardStyle}>
            <div style={{ ...headerStyle, cursor: 'default' }}>
              <span style={headerTextStyle}>Nội dung quy trình</span>
              <button style={{ padding: '4px 12px', backgroundColor: '#7B5233', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight:'bold', cursor:'pointer' }}>
                Xem trước
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              minHeight: '480px',
              borderTop: '1px solid #EADCC9'
            }}>
              {/* Left Column: Menu TOC list */}
              <div style={{
                borderRight: `1.5px solid ${cardBorderColor}`,
                backgroundColor: '#FAF8F5',
                padding: '16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Mục lục</span>
                {[
                  { id: 'Mục đích', label: '1. Mục đích' },
                  { id: 'Phạm vi áp dụng', label: '2. Phạm vi áp dụng' },
                  { id: 'Tài liệu viện dẫn', label: '3. Tài liệu viện dẫn' },
                  { id: 'Định nghĩa và viết tắt', label: '4. Định nghĩa từ viết tắt' },
                  { id: 'Nội dung', label: '5. Nội dung' },
                  { id: 'Biểu mẫu', label: '6. Biểu mẫu' }
                ].map((section, sIdx) => {
                  const isSelected = activeMenu === section.id;
                  const currentType = formData.section_types?.[section.id] || 'text';
                  return (
                    <div
                      key={sIdx}
                      onClick={() => setActiveMenu(section.id)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        color: isSelected ? '#7B5233' : '#475569',
                        backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{section.label}</span>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {currentType === 'flowchart' ? 'Lưu trình' : 'Văn bản'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Unified live editing area with custom content type definition */}
              <div style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: 'white'
              }}>


                {formData.section_types?.[activeMenu] === 'flowchart' ? (
                  /* RENDER FLOWCHART WORKSPACE */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: `1.5px solid ${cardBorderColor}`,
                      boxShadow: '0 4px 16px rgba(123, 82, 51, 0.05)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
                        alignItems: 'stretch'
                      }}>
{/* Left Side: Flowchart Canvas column */}
                        <div style={{
                          borderRight: `1.5px solid ${cardBorderColor}`,
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          minHeight: '520px',
                          alignItems: 'center',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}>
                          {/* Visual Flowchart Canvas */}
                          <div style={{
                            width: '100%',
                            flex: 1,
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            backgroundColor: '#F8FAFC',
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            overflow: 'auto',
                            maxHeight: '480px',
                            position: 'relative'
                          }}>
                            {/* Floating Glassmorphic Zoom Toolbar */}
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              display: 'flex',
                              gap: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #cbd5e1',
                              borderRadius: '20px',
                              padding: '2px 8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              zIndex: 30,
                              alignItems: 'center'
                            }}>
                              <button
                                type="button"
                                onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569' }}
                                title="Thu nhỏ (Zoom Out)"
                              >
                                <ZoomOut size={14} />
                              </button>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', minWidth: '32px', textAlign: 'center', color: '#475569', userSelect: 'none' }}>
                                {Math.round(zoomScale * 100)}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setZoomScale(prev => Math.min(1.4, prev + 0.1))}
                                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569' }}
                                title="Phóng to (Zoom In)"
                              >
                                <ZoomIn size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setZoomScale(1.0)}
                                style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569', borderLeft: '1px solid #cbd5e1', marginLeft: '2px', paddingLeft: '6px' }}
                                title="Mặc định (100%)"
                              >
                                <Maximize2 size={12} />
                              </button>
                            </div>

                            <div 
                              id="flowchart-canvas-container"
                              style={{
                                transform: `scale(${zoomScale})`,
                                transformOrigin: 'top center',
                                width: 'max-content',
                                minWidth: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '20px',
                                transition: 'transform 0.15s ease-out',
                                paddingBottom: '40px',
                                position: 'relative',
                                paddingLeft: '40px',
                                paddingRight: '40px'
                              }}
                            >
                              <FlowchartConnectors steps={formData.steps} zoomScale={zoomScale} />
                              {formData.steps.length === 0 ? (
                                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px', fontSize: '0.82rem' }}>
                                  Chưa có bước nào. Click nút "Thêm bước mới" để bắt đầu thiết lập.
                                </div>
                              ) : (
                                (() => {
                                  // Filter main steps to render vertically
                                  const mainSteps = formData.steps.filter(s => !sidestepSet.has(s.step_number));
                                  
                                  return mainSteps.map((step, mainIdx) => {
                                    const idx = formData.steps.findIndex(s => s.step_number === step.step_number);
                                    const isDecision = step.node_type === 'decision';
                                    const leftColumnWidth = maxLeftChainLength * 270;
                                    
                                    const chain = [];
                                    if (isDecision) {
                                      const failPath = step.fail_path || [];
                                      let current = failPath[0]?.return_to_step;
                                      const visited = new Set();
                                      while (current && !visited.has(current)) {
                                        visited.add(current);
                                        const currStep = formData.steps.find(s => s.step_number === current);
                                        if (currStep) {
                                          chain.push(currStep);
                                          current = currStep.transition?.next_step || currStep.next_step;
                                          if (mainSteps.some(ms => ms.step_number === current)) break;
                                        } else break;
                                      }
                                    }
                                    return (
                                      <React.Fragment key={step.step_number}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                                          <div style={{ 
                                            width: `${leftColumnWidth}px`, 
                                            marginRight: isDecision ? '-50px' : '0px',
                                            display: 'flex', 
                                            justifyContent: 'flex-end', 
                                            alignItems: 'center',
                                            flexShrink: 0
                                          }}>
                                            {chain.length > 0 && (
                                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0px' }}>
                                                {[...chain].reverse().map((cStep, rIdx) => {
                                                  const cStepIdx = formData.steps.findIndex(s => s.step_number === cStep.step_number);
                                                  return (
                                                    <React.Fragment key={cStep.step_number}>
                                                      <div style={{ flexShrink: 0 }}>
                                                        {renderSingleStepCard(cStep, cStepIdx)}
                                                      </div>
                                                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, margin: '0 6px', gap: '2px', zIndex: 6 }}>
                                                        <div style={{
                                                          width: 0,
                                                          height: 0,
                                                          borderTop: '5px solid transparent',
                                                          borderBottom: '5px solid transparent',
                                                          borderRight: '7px solid #ef4444'
                                                        }} />
                                                        <div style={{ width: '20px', height: '2.5px', backgroundColor: '#ef4444' }} />
                                                      </div>
                                                    </React.Fragment>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ 
                                            width: '240px', 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            alignItems: 'center',
                                            flexShrink: 0,
                                            zIndex: 2,
                                            position: 'relative'
                                          }}>
                                            {renderSingleStepCard(step, idx)}
                                          </div>
                                          <div style={{ 
                                            width: `${leftColumnWidth}px`, 
                                            marginLeft: isDecision ? '-50px' : '0px',
                                            flexShrink: 0 
                                          }} />
                                        </div>
                                        {mainIdx < mainSteps.length - 1 && (
                                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                                            <div style={{ width: `${leftColumnWidth}px`, marginRight: isDecision ? '-50px' : '0px', flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '240px', height: '24px', margin: '-10px 0', flexShrink: 0 }}>
                                              <div style={{ width: '2px', height: '16px', backgroundColor: '#cbd5e1' }} />
                                              <div style={{
                                                width: 0,
                                                height: 0,
                                                borderLeft: '4px solid transparent',
                                                borderRight: '4px solid transparent',
                                                borderTop: '6px solid #cbd5e1'
                                              }} />
                                            </div>
                                            <div style={{ width: `${leftColumnWidth}px`, marginLeft: isDecision ? '-50px' : '0px', flexShrink: 0 }} />
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  });
                                })()
                              )}

                              {/* Add step button at the bottom of the canvas column, aligned with the main axis */}
                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: '12px' }}>
                                {/* Left column spacer */}
                                <div style={{ width: `${maxLeftChainLength * 270}px`, flexShrink: 0 }} />
                                
                                {/* Middle column button */}
                                <div style={{ display: 'flex', justifyContent: 'center', width: '240px', flexShrink: 0 }}>
                                  <button
                                    onClick={handleAddStep}
                                    style={{
                                      padding: '6px 16px',
                                      backgroundColor: 'white',
                                      border: '1.5px solid #7B5233',
                                      color: '#7B5233',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 4px rgba(123, 82, 51, 0.05)'
                                    }}
                                  >
                                    <Plus size={14} /> Thêm bước mới
                                  </button>
                                </div>
                                
                                {/* Right column spacer */}
                                <div style={{ width: `${maxLeftChainLength * 270}px`, flexShrink: 0 }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Step Details Editor */}
                        <div style={{
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          overflowY: 'auto',
                          maxHeight: '520px'
                        }}>
                          {formData.steps[selectedStepIdx] ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bước:</label>
                                  <select
                                    value={selectedStepIdx}
                                    onChange={(e) => setSelectedStepIdx(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    {formData.steps.map((s, idx) => (
                                      <option key={idx} value={idx}>Bước {s.step_number}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Kiểu bước:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].node_type || 'task'}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'node_type', e.target.value)}
                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white', fontWeight: 'bold', color: '#7B5233' }}
                                  >
                                    <option value="task">Công việc thường</option>
                                    <option value="decision">Quyết định (Yes/No)</option>
                                    <option value="condition">Nhiều điều kiện</option>
                                    <option value="terminal">Kết thúc</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bộ phận phụ trách:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].assignee_role || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'assignee_role', e.target.value)}
                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    <option value="Kho">Bộ phận Kho</option>
                                    <option value="QC">Bộ phận QC / QLCL</option>
                                    <option value="Sản xuất">Bộ phận Sản xuất</option>
                                    <option value="Thu mua">Bộ phận Thu mua</option>
                                    <option value="Bán hàng">Bộ phận Bán hàng</option>
                                    <option value="Admin">Ban Giám Đốc</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tiêu đề công việc:</label>
                                <input
                                  type="text"
                                  value={formData.steps[selectedStepIdx].name || ''}
                                  onChange={(e) => handleUpdateStep(selectedStepIdx, 'name', e.target.value)}
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                                />
                              </div>

                              {/* DYNAMIC CONDITIONAL ROUTING SUB-PANEL */}
                              {formData.steps[selectedStepIdx].node_type === 'decision' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '2px' }}>Chọn bước đúng (Yes):</label>
                                      <select 
                                        value={formData.steps[selectedStepIdx]?.transition?.next_step === null ? 'custom' : (formData.steps[selectedStepIdx]?.transition?.next_step || '')} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setFormData(prev => {
                                            const steps = prev.steps.map(s => ({ ...s }));
                                            if (!steps[selectedStepIdx]) return prev;
                                            if (val === 'new_step') {
                                              const nextStepNum = steps.length + 1;
                                              const newStep = {
                                                step_number: nextStepNum,
                                                name: `Bước mới ${nextStepNum}`,
                                                node_type: 'task',
                                                assignee_role: 'QC',
                                                transition: null,
                                                fail_path: []
                                              };
                                              steps.push(newStep);
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: nextStepNum } };
                                              setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                              return { ...prev, steps };
                                            } else if (val === 'custom') {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
                                              return { ...prev, steps };
                                            } else if (val === '') {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: null };
                                              return { ...prev, steps };
                                            } else {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: parseInt(val) } };
                                              return { ...prev, steps };
                                            }
                                          });
                                        }}
                                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor:'white', color: '#7B5233', fontWeight: 'bold' }}
                                      >
                                        <option value="">-- Chọn bước --</option>
                                        <option value="new_step">➕ Tạo bước mới...</option>
                                        <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                        {formData.steps.map((s, idx) => (
                                          <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '2px' }}>Chọn bước sai (No):</label>
                                      <select 
                                        value={getStepFailPath(formData.steps[selectedStepIdx])[0]?.return_to_step === null && getStepFailPath(formData.steps[selectedStepIdx])[0]?.name ? 'custom' : (getStepFailPath(formData.steps[selectedStepIdx])[0]?.return_to_step || '')} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setFormData(prev => {
                                            const steps = prev.steps.map(s => ({ ...s }));
                                            if (!steps[selectedStepIdx]) return prev;
                                            const currentStep = steps[selectedStepIdx];
                                            const failPath = [...getStepFailPath(currentStep)];
                                            if (val === 'new_step') {
                                              const nextStepNum = steps.length + 1;
                                              const newStep = {
                                                step_number: nextStepNum,
                                                name: `Bước mới ${nextStepNum}`,
                                                node_type: 'task',
                                                assignee_role: 'QC',
                                                transition: null,
                                                fail_path: []
                                              };
                                              steps.push(newStep);
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Không đồng ý", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: nextStepNum }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: nextStepNum } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, fail_path: newFailPath, has_branch: true };
                                              setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                              return { ...prev, steps };
                                            } else if (val === 'custom') {
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Hủy bỏ / Trả hàng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: null, node_type: "terminal" }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hủy bỏ / Trả hàng" } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, has_branch: true, fail_path: newFailPath };
                                              return { ...prev, steps };
                                            } else if (val === '') {
                                              steps[selectedStepIdx] = { ...currentStep, fail_path: [], has_branch: false };
                                              return { ...prev, steps };
                                            } else {
                                              const stepNum = parseInt(val);
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Xử lý lỗi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: stepNum }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: stepNum } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, has_branch: true, fail_path: newFailPath };
                                              return { ...prev, steps };
                                            }
                                          });
                                        }}
                                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor:'white', color: '#7B5233', fontWeight: 'bold' }}
                                      >
                                        <option value="">-- Chọn bước --</option>
                                        <option value="new_step">➕ Tạo bước mới...</option>
                                        <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                        {formData.steps.map((s, idx) => (
                                          <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Custom config for Yes outcome */}
                                  {formData.steps[selectedStepIdx]?.transition?.next_step === null && (
                                    <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '6px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Nhãn kết quả (Yes):</label>
                                        <input
                                          type="text"
                                          value={formData.steps[selectedStepIdx].transition.name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, name: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Ví dụ: Hoàn tất, Chấp nhận..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={formData.steps[selectedStepIdx].transition.node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, node_type: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                          <option value="decision">Hình thoi (Quyết định)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom config for No outcome */}
                                  {getStepFailPath(formData.steps[selectedStepIdx])[0] && getStepFailPath(formData.steps[selectedStepIdx])[0].return_to_step === null && (
                                    <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '6px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '2px' }}>Nhãn kết quả (No):</label>
                                        <input
                                          type="text"
                                          value={getStepFailPath(formData.steps[selectedStepIdx])[0].name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                              if (failPath[0]) {
                                                const newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, name: e.target.value } : { ...fp });
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], fail_path: newFailPath };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Ví dụ: Hủy bỏ, Trả hàng NCC..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={getStepFailPath(formData.steps[selectedStepIdx])[0].node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                              if (failPath[0]) {
                                                const newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, node_type: e.target.value } : { ...fp });
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], fail_path: newFailPath };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                          <option value="decision">Hình thoi (Quyết định)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {formData.steps[selectedStepIdx].node_type === 'condition' && (
                                <div style={{ backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>Nhánh điều kiện rẽ hướng:</span>
                                  
                                  {getStepFailPath(formData.steps[selectedStepIdx]).map((branch, branchIdx) => (
                                    <div key={branchIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                                      <div>
                                        <input 
                                          type="text" 
                                          value={branch.name || ''} 
                                          onChange={(e) => {
                                            const steps = [...formData.steps];
                                            const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                            failPath[branchIdx] = { ...failPath[branchIdx], name: e.target.value };
                                            steps[selectedStepIdx].fail_path = failPath;
                                            setFormData({ ...formData, steps });
                                          }}
                                          placeholder="Nhập điều kiện..." 
                                          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }} 
                                        />
                                      </div>
                                      <div>
                                        <select 
                                          value={branch.return_to_step || ''} 
                                          onChange={(e) => {
                                            const steps = [...formData.steps];
                                            const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                            failPath[branchIdx] = { ...failPath[branchIdx], return_to_step: parseInt(e.target.value) };
                                            steps[selectedStepIdx].fail_path = failPath;
                                            setFormData({ ...formData, steps });
                                          }}
                                          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="">-- Chọn --</option>
                                          {formData.steps.map((s, idx) => (
                                            <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const steps = [...formData.steps];
                                          const failPath = getStepFailPath(steps[selectedStepIdx]).filter((_, bIdx) => bIdx !== branchIdx);
                                          steps[selectedStepIdx].fail_path = failPath;
                                          setFormData({ ...formData, steps });
                                        }}
                                        style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}

                                  <button 
                                    onClick={() => {
                                      const steps = [...formData.steps];
                                      const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                      failPath.push({ name: '', assignee_role: steps[selectedStepIdx].assignee_role || 'QC', return_to_step: null });
                                      steps[selectedStepIdx].fail_path = failPath;
                                      steps[selectedStepIdx].has_branch = true;
                                      setFormData({ ...formData, steps });
                                    }}
                                    style={{
                                      alignSelf: 'flex-start',
                                      padding: '2px 8px',
                                      fontSize: '9px',
                                      border: '1px dashed #7B5233',
                                      backgroundColor: 'white',
                                      color: '#7B5233',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                  >
                                    <Plus size={10} /> Thêm nhánh điều kiện
                                  </button>
                                </div>
                              )}



                              {/* Bước tiếp theo (Transition) configuration for normal task steps */}
                              {formData.steps[selectedStepIdx].node_type !== 'decision' && formData.steps[selectedStepIdx].node_type !== 'condition' && formData.steps[selectedStepIdx].node_type !== 'terminal' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>Bước tiếp theo:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].transition?.next_step === null ? 'custom' : (formData.steps[selectedStepIdx].transition?.next_step || '')}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const steps = prev.steps.map(s => ({ ...s }));
                                        if (!steps[selectedStepIdx]) return prev;
                                        if (val === 'new_step') {
                                          const nextStepNum = steps.length + 1;
                                          const newStep = {
                                            step_number: nextStepNum,
                                            name: `Bước mới ${nextStepNum}`,
                                            node_type: 'task',
                                            assignee_role: 'QC',
                                            transition: null,
                                            fail_path: []
                                          };
                                          steps.push(newStep);
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: nextStepNum } };
                                          setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                          return { ...prev, steps };
                                        } else if (val === 'custom') {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
                                          return { ...prev, steps };
                                        } else if (val === '') {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: null };
                                          return { ...prev, steps };
                                        } else {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: parseInt(val) } };
                                          return { ...prev, steps };
                                        }
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor: 'white', color: '#7B5233', fontWeight: 'bold' }}
                                  >
                                    <option value="">-- Mặc định (bước tiếp theo) --</option>
                                    <option value="new_step">➕ Tạo bước mới...</option>
                                    <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                    {formData.steps.map((s, idx) => (
                                      <option key={idx} value={s.step_number}>B{s.step_number}: {s.name}</option>
                                    ))}
                                  </select>
                                  
                                  {/* Custom outcome options for regular step if terminal */}
                                  {formData.steps[selectedStepIdx].transition?.next_step === null && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginTop: '4px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.64rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Nhãn kết quả:</label>
                                        <input
                                          type="text"
                                          value={formData.steps[selectedStepIdx].transition.name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, name: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Hoàn tất..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.64rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={formData.steps[selectedStepIdx].transition.node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, node_type: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', backgroundColor: 'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Đính kèm tài liệu:</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={formData.steps[selectedStepIdx].template_files || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'template_files', e.target.value)}
                                    placeholder="Tên file đính kèm..."
                                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <span style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '9px', color: '#475569' }}>G7.CL.QTxxx</span>
                                    <span style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '9px', color: '#475569' }}>G7.CL.QTXXa</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ color:'#9ca3af', textAlign:'center', marginTop:'40px', fontSize: '0.8rem' }}>Chọn một bước để cấu hình thuộc tính</div>
                          )}
                        </div>
                      </div>
                    </div>

                    
                  </div>
                ) : (
                  /* RENDER RICH TEXT EDITOR */
                  <RichTextEditor
                    value={formData.sections[activeMenu] || ''}
                    onChange={(val) => handleSectionChange(activeMenu, val)}
                    placeholder={`Nhập nội dung cho phần: ${activeMenu}...`}
                    style={{ flex: 1, minHeight: '420px' }}
                  />
                )}
              </div>

            </div>
          </div>

          {/* Card: Hướng dẫn thực hiện (Các bước lưu đồ) - Chỉ hiển thị khi ở Quy trình, ẩn ở Mẫu ISO (Ảnh 3) */}
          {isProcessMode && (
            <div style={cardStyle}>
              <div style={headerStyle} onClick={() => setStepsAccordionExpanded(!stepsAccordionExpanded)}>
                <span style={headerTextStyle}>Hướng dẫn thực hiện (Các bước lưu đồ)</span>
                {stepsAccordionExpanded ? <ChevronUp size={16} style={{color:accentColor}} /> : <ChevronDown size={16} style={{color:accentColor}} />}
              </div>
              
              {stepsAccordionExpanded && (
                <div style={{ borderTop: '1px solid #EADCC9', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                    {formData.steps.map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedStepIdx(idx);
                          setCurrentScreen('step_instructions');
                        }}
                        style={{
                          padding: '10px 14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          backgroundColor: 'white',
                          color: '#7B5233',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#7B5233', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
                        <span>{step.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      handleAddStep();
                      setCurrentScreen('step_instructions');
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '6px 16px',
                      backgroundColor: '#FAF6F0',
                      border: '1px dashed #7B5233',
                      borderRadius: '4px',
                      color: '#7B5233',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '12px'
                    }}
                  >
                    <Plus size={12} /> Cấu hình sơ đồ các bước
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Card: Lịch sử kiểm tra - Chỉ hiển thị khi ở Quy trình, ẩn ở Mẫu ISO */}
          {isProcessMode && (
            <div style={cardStyle}>
              <div style={headerStyle} onClick={() => setHistoryAccordionExpanded(!historyAccordionExpanded)}>
                <span style={headerTextStyle}>Lịch sử kiểm tra</span>
                {historyAccordionExpanded ? <ChevronUp size={16} style={{color:accentColor}} /> : <ChevronDown size={16} style={{color:accentColor}} />}
              </div>
              
              {historyAccordionExpanded && (
                <div style={{ borderTop: '1px solid #EADCC9', padding: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                  <div>Không có thay đổi nào gần đây được ghi nhận.</div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* --- SCREEN 2: HƯỚNG DẪN THỰC HIỆN DẠNG BƯỚC HÌNH ẢNH (Ảnh 4) --- */}
      {currentScreen === 'step_instructions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: `1.5px solid ${cardBorderColor}`,
            padding: '20px',
            boxShadow: '0 4px 16px rgba(123, 82, 51, 0.05)'
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7B5233', borderBottom: '1px solid #EADCC9', paddingBottom: '10px', marginBottom: '20px' }}>
              Hướng dẫn thực hiện
            </div>

            {/* Grid of step cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
              alignItems: 'stretch'
            }}>
              {formData.steps.map((step, idx) => (
                <div 
                  key={idx} 
                  style={{
                    backgroundColor: 'white',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  {/* Delete step button */}
                  <button
                    onClick={() => handleRemoveStep(idx)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    title="Xóa bước này"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Image Uploader Panel */}
                  <div 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        handleImageUpload(idx, file);
                      };
                      input.click();
                    }}
                    style={{
                      height: '140px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {step.image_url ? (
                      <img 
                        src={step.image_url} 
                        alt={step.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <Image size={32} />
                        <span style={{ fontSize: '0.7rem' }}>Tải ảnh công đoạn</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom input section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#0284c7',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap'
                    }}>
                      {stepDisplayLabels[step.step_number] || `Bước ${step.step_number}`}
                    </span>
                    <input
                      type="text"
                      value={step.name || ''}
                      onChange={(e) => handleUpdateStep(idx, 'name', e.target.value)}
                      placeholder="Nhập công việc..."
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add step button */}
            <button
              onClick={handleAddStep}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#7B5233',
                fontSize: '0.88rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '6px 0',
                marginTop: '16px'
              }}
            >
              <Plus size={16} /> Thêm bước mới
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ISOProcessEditorView;
