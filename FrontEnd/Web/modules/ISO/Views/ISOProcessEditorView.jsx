import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@webShared/Services/api.service';

const removeDiacritics = (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd');
};

const isGenericNameText = (text) => {
  if (!text) return false;
  const clean = removeDiacritics(text.normalize('NFC')).trim().toLowerCase().replace(/[\[\]]/g, '');
  return ['ten quy trinh', 'ten tai lieu', 'ten bieu mau', 'ten'].some(val => clean.includes(val));
};

const logoCty = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKgAAACeCAIAAAA63ZanAAAgAElEQVR4nOy9abAl2XEe9mXmOaeq7vLuW3rv2TcMAGJALASMTdwEcQFtWbRMWgzZCpmWbUXYZti/rB+SbEc4wg7TYQVDPyTSVtCiGaZFBk3aooOGsRE7CHAGA84A4GBmetae3t92l6o6JzP9o+7r6ZnBEFzQwhAxGR3R3ffdV6/uyTqZX3755Xnk7njdvnuNv9M38LrdXHvdwd/l9vrDv4ut9cd/F1urzv4u9zCd/oG/rw21PFE9Me88ue//mB/tmt+e+/nT2v0OtHx3W2vh+jvcvsL4+BvGmleDz/f0v7C5+Dr9q841X3LZ+s7lXRfZn+RHOzurwRT1//xMjT0ag54tXX/4x32Z/DWdxZbXbe/SA7+pvYy7w4Pgbt/u6L3y67zLR32as/Zd8rTf0Ec7KDr6/bShXIavg6YAmAiAsEZL77fyAEYyOHkJDcij/VlydwIZOtL3WhGxA4fPGQADd9OTk7rv4f3GQDY8P1EQo7rEYduvOjR/fs3+TTffnvNOVgNRODBbWruTuxEDDcQAQJfrw2BnNDlnoMEIhYid6gCAJjA7k5ugIEMbHAFsVsqzgxiZrgSCMzQQs6AgsgJBnd3EAURy4UdIAIZXAGABGAtRBIpwEHFc0EBGcGFmSEAEzEUZsPjAPiRnx1gckABdwS6uT5+zTkYrkT8LQt0p/VyJUml9J1mJk8hchC4m6GoMnOQCFJAYQU5w4yblMzBBDeYwR1FoYoYAQPA5EwML05EcAkCEEjx4pNFYGZIUVhvHFlIBHBkh700oIP8m2xSdzjWr9/sHfyaIzpUMxENoW1IpURCRGZGRERMtF6gYe1eErrdDaoMg9jwLncyFbdAxMMlDw5clUEgWkcFGva9ORkRgWFETk5E4LhsiUOVUhQhIjK4OpsTp8YMRBDAS4Z2QkYiKgEUiQjm7k4OIiJ2f0leOMordPTnptlrbQcbwQiENTxhP1oCJ9iwmkOcczjAQG77IEJBQENgdQEYRV1BxjAWYlVktVK476hfYbVou67tlqvFspQeZqXkvm9BxowQgogwEzNTCNOd0xQbqWuqakhiicwRJDAykDsLBYQIEWT1PiNFZ6J1ajbQkFnIoUNsZ9A6FhjAN30Lv9Z2sLllAGByh4ONAGciNnMwXd8F7mCHEQYUo1rEEcjgDmuhPSpCu8iL/W6x6Jerdr5sF6vSLivKmheuZmZacmAIgbRoydAibgSQG8zIATZlK6bFGEixmY03j012TsfZdrV5HOMNxKZkKkZVaIgjCJlAAiYQCpmCHEQgMgxIWggMG7IBAEBuro9fcw6GFwBOcJCBAXYQAHMnGhzsQxlEbk7WWSb2CI7uMEPfIbfQ5eLaxdVyf3V40LetFWVIQCSo28K0ZxDILPdwE4fnNjF5KaQlmLE6SoY7oyt2KAGgyhFLCa1JZ2FFsnHyzOzsrdtn78B0B9Um4hgWoCjBwcTkPOxgAAwwD/dPEODFOPWvIES/Bh2sWDuYDXy9xBgCMsPJDa6Dgwm9c0ukyG6L1fLabru3l1cL11XOLagAABgeTMmMzayZxuIaGOQopXcrVMxyq6sVSuZSgnk0gxbSIrSq+YBsZVm0wAoRAofoIR72/cI9xzptntg8e+fWmTurrdMYTVGNXCKRrHMFABIw3I2GfA8enk8Q002G0HjtORhYgxMG4Ecf3wF3E3JyEBSmsAJTUEa/368OVgerbr60tljJbObI6jlUqWmaVNUSx0EqlhFCgPXFjRnMbF4AkKmXwpa1a/v5Ii8XeT5fzQ/75QJ5Pqa9hF4gVBxFLWcpBZ6ZkWG9xDbEQ9Q23tq59Z6d2+9Nt9wJaUAVKAIRCE5CDFNlWT+u6mbEgBDoJkfo75yDB1SMV1A8qgPuBACjAVIZAzAVdjigHUr2nEvurF/tXXiePGuhUsyNYpXq6bgZ10hczzYsq7NIs4lsUAEJ1BAEALSAHSkChpK19MIEJpiiW5aDg8ODA13sXXvmsaCddZ11K+7b2vuJdZWtpF9o6cA+N+vrcZcmewU03Tl7/9unJ25tTtyOOIVMC9cUpBiEHFSYHHBzGIuBHVTj5lJc3zEHvxqH98q7IZhbIQJKhhvI0S7n+7uLw7mW3tuOQSyhGo3Hk404niAFBM6mXEU3kAShaOoMhgLO4AC4mTkTB3KCWREmh5fcm2a2zHBxIij29/Rwf/fa5b3L59v9i9IeTvLBqCw2Wfv9K00dIOHyYtVxzPVoSTHLeHLq9uO3v2l271vR7CCMWuVQRQB9aQWaQgJIQQYZiBu+mXv4O+zgVzK0ZSCLHA5zV4IJnMi89JQicl7uXl0cHJbc5Zz7vp8dO1WPJtPxGLGCk8MpBMRkZsWUGcLirkwABowd1wAH7kwOgMmAXLpALMK8rmAMalBFdkBRWl3sHe6eP7xwbv7CU+Xy8/Xq4MS48sXCcl+PJ8VoYW4SVubXVqU+cceJe9566q3vRrPpo82ehTh01kaiSMHNABaOpViQbxLGvo32mnPwmpEcuD0rQMGAt7puvndtsVhYUS9atK/rejzbTBtbLiEQswg4wMkdpgxidSdyYoX3Itqt9uumgTVwMQDMANTgTEzscHbD9ZLbHK5QeAGFgODwFbqDdu/C8sKzeffi/JlzVTunxX7jbm1rqnWdVl2LEKkevzDv83i7OXvvm//SB7F9sjXmZpQ5RIqAlzanEIMk7XuJ0em70cGvtOFOclaGE7vA4cVKm/tOcz9fHHjR5XKZs25sbJw8cZrq2ixbCgaHK4MCBZDAEzzCCQxVU1vFkM3mL1x88tjxk6E6oZ6GisUd7uRA4EgghpmqmxG5gMAE4oFRMc/wLFSIevQr9As//+ylb3z18uN/NEMea8/LeU2Wu5WKWEjcTM8fzG16jLeO3/GO94xuuxfbp7KJcg1nK16RiAQUReCB17pJPn6tMVlIiaEGN7ADYPXcL5eHB33fq2o9Hp2abdejsUOIAte1Ws9Mgugofe5NSZhiiOZgQMjhSliR7i12z22MwXECYkIYWkNEGNoSbupETCIxwof+kqmaSxjexRDAgAqpAho6VZ+cHPe0cfD0N7jdSzlTeziqk4KWq0VeHd61c/z83nN7ey880R7cldvxdBa9VhRK45TIsnK7ohDc6abCrNfKDl5HbBjcoMVKb6Uruc3dou1Wfd8y88bW9nhjC5zcCBSN2ZxIYilFrWVBECGIg3Nx4eSmFSvZAfSidRe/9sinTpy5c+f0ezzuCEczBwJBHGJmIlHd3Mihg+eJyMlAYQjaUHM1AO5kVuClEQf3/dcefPLzH6Vr53fQSb9ITF5y9LxcziXFFadufPyqbD7woz8tJ+/SjVMljoPAinm/Sik4i4Ov0+/fdrv5O/io7fmy54he+tWB9HFXcgUrs/e5PZzv930bhevxZHtrx0BFSRgUGwfgxMRWKFDgVBm8h7kbQygwAX1ZVgHgVldXvbtAi2f7a0on7yNU8AmbmBeSgfc3VYCFxZxYQA53uJkbspAIGMyD34uDUYmgbZd1sXTrffc3ze7jf3jhaw9XkKqfTwlkmNWVag5e7OByktW5L3z0zvdF2dgyFUcdAhMCwbD"
import FlowchartTable from './FlowchartTable';
import FlowchartCanvas from './FlowchartCanvas';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Edit, ChevronUp, ChevronDown, CheckCircle, AlertCircle, 
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
      <style>{`
        .rich-editor-canvas:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="rich-editor-canvas"
        style={{
          minHeight: '260px',
          padding: '16px 20px',
          outline: 'none',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#000000',
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
    
    // Get current sidestep list to verify sequential steps
    const getSidestepsList = () => {
      const sidesteps = new Set();
      (steps || []).forEach(s => {
        if (s.node_type === 'decision') {
          const failPath = s.fail_path || [];
          const noStepNum = failPath[0]?.return_to_step;
          if (noStepNum) {
            sidesteps.add(noStepNum);
            let current = noStepNum;
            while (current) {
              const currStep = steps.find(st => String(st.step_number) === String(current));
              const next = currStep?.transition?.next_step || currStep?.next_step;
              if (next && String(next) !== String(current) && !steps.some(st => String(st.step_number) === String(next) && st.node_type === 'decision')) {
                sidesteps.add(next);
                current = next;
              } else break;
            }
          }
        }
      });
      return sidesteps;
    };
    
    const currentSidesteps = getSidestepsList();
    const mainSteps = steps.filter(s => !currentSidesteps.has(s.step_number));

    steps.forEach((step, idx) => {
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

      if (step.node_type === 'decision') {
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
      } else {
        // Draw lines for custom transitions on regular steps
        const nextStepNum = step.transition?.next_step;
        if (nextStepNum) {
          const targetEl = document.getElementById(`step-card-${nextStepNum}`);
          if (targetEl) {
            const targetRect = targetEl.getBoundingClientRect();
            const target = getRelativeRect(targetRect);

            const sourceCenterX = source.left + source.width / 2;
            const targetCenterX = target.left + target.width / 2;
            const sourceCenterY = source.top + source.height / 2;
            const targetCenterY = target.top + target.height / 2;

            // Check if target is directly below source (sequential main flow)
            const isDirectlyBelow = target.top > source.top + source.height && Math.abs(sourceCenterX - targetCenterX) < 40;
            
            // Check if it's the sequential next main step
            const currentMainIdx = mainSteps.findIndex(ms => ms.step_number === step.step_number);
            const isNextMainStep = currentMainIdx !== -1 && mainSteps[currentMainIdx + 1]?.step_number === nextStepNum;
            const isSequential = isNextMainStep && isDirectlyBelow;

            if (!isSequential) {
              let startX, startY, endX, endY, pathD, arrowDirection;
              
              // Target is to the left (e.g. sidestep)
              if (targetCenterX < sourceCenterX - 50) {
                startX = source.left;
                startY = sourceCenterY;
                endX = target.left + target.width;
                endY = targetCenterY;
                
                const isHorizontal = Math.abs(startY - endY) < 40;
                if (isHorizontal) {
                  pathD = `M ${startX} ${startY} H ${endX}`;
                } else {
                  pathD = `M ${startX} ${startY} H ${startX - 30} V ${endY} H ${endX}`;
                }
                arrowDirection = 'left';
              }
              // Target is to the right
              else if (targetCenterX > sourceCenterX + 50) {
                startX = source.left + source.width;
                startY = sourceCenterY;
                endX = target.left;
                endY = targetCenterY;
                
                const isHorizontal = Math.abs(startY - endY) < 40;
                if (isHorizontal) {
                  pathD = `M ${startX} ${startY} H ${endX}`;
                } else {
                  pathD = `M ${startX} ${startY} H ${startX + 30} V ${endY} H ${endX}`;
                }
                arrowDirection = 'right';
              }
              // Target is directly above (loop back) or below but offset
              else {
                startX = source.left + source.width;
                startY = sourceCenterY;
                endX = target.left + target.width;
                endY = targetCenterY;
                
                pathD = `M ${startX} ${startY} H ${startX + 40} V ${endY} H ${endX}`;
                arrowDirection = 'left';
              }

              newPaths.push({
                key: `task-link-${step.step_number}-${nextStepNum}`,
                d: pathD,
                color: '#64748b', // Slate gray for custom task transitions
                label: '➔',
                startX,
                startY,
                arrowX: endX,
                arrowY: endY,
                arrowDirection
              });
            }
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
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const isProcessMode = true;
  const backPath = isProcessMode ? '/admin/iso-processes' : '/admin/iso-documents';
  const isEditMode = id && id !== 'new';



  // Screen routing states: 'overview' (Màn hình 1), 'step_instructions' (Ảnh 4)
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [activeTab, setActiveTab] = useState('content');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activeMenu, setActiveMenu] = useState('Mục đích'); 
  const [selectedStepIdx, setSelectedStepIdx] = useState(-1);
  const [flowchartMode, setFlowchartMode] = useState(() => {
    return localStorage.getItem('iso_flowchart_mode') || 'classic';
  });

  const flowchartCanvasRef = useRef(null);

  const handleSetFlowchartMode = (mode) => {
    setFlowchartMode(mode);
    localStorage.setItem('iso_flowchart_mode', mode);
  };

  const [infoExpanded, setInfoExpanded] = useState(true);
  const [selectedInstructionId, setSelectedInstructionId] = useState(null);
  const [showStepPopup, setShowStepPopup] = useState(false);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editingStepIdx, setEditingStepIdx] = useState(-1);
  const [stepForm, setStepForm] = useState({
    id: '',
    step_number: 1,
    name: '',
    note: '',
    standard: '',
    image_url: ''
  });
  // Accordion collapsed states - initialized to false (collapsed) by default
  const [stepsAccordionExpanded, setStepsAccordionExpanded] = useState(false);
  const [historyAccordionExpanded, setHistoryAccordionExpanded] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    symbol: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    file_path: '',
    status: 'Hiệu lực',
    folder: '', // display_at
    doc_type: '', // note
    document_level: '',
    iso_document_id: '',
    iso_document_code: '',
    iso_document_name: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {},
    section_types: {},
    steps: [],
    instruction_steps: [],
    work_instructions: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [systemScreens, setSystemScreens] = useState([]);
  const [isScreenDropdownOpen, setIsScreenDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const data = await api.get('/screens');
        setSystemScreens(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách màn hình:', err);
      }
    };
    fetchScreens();
  }, []);

  const handleToggleScreen = (routePath) => {
    const currentList = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
    let newList;
    if (currentList.includes(routePath)) {
      newList = currentList.filter(p => p !== routePath);
    } else {
      newList = [...currentList, routePath];
    }
    handleInputChange('folder', newList.join(', '));
  };

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
            const currStep = formData.steps.find(s => String(s.step_number) === String(current));
            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && String(next) !== String(current) && !formData.steps.some(s => String(s.step_number) === String(next) && s.node_type === 'decision')) {
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
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
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
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
          if (currStep) {
            labels[currStep.step_number] = `B${prefixNum}.${subIdx}`;
            subIdx++;
            current = currStep.transition?.next_step || currStep.next_step;
            if (mainSteps.some(ms => String(ms.step_number) === String(current))) {
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

  const handleQuickTransitionChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
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
        steps[index] = { ...steps[index], transition: { next_step: nextStepNum } };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        steps[index] = { ...steps[index], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...steps[index], transition: null };
        return { ...prev, steps };
      } else {
        steps[index] = { ...steps[index], transition: { next_step: parseInt(val) } };
        return { ...prev, steps };
      }
    });
  };

  const handleQuickFailPathChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
      const currentStep = steps[index];
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
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Hủy bỏ / Trả hàng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: null, node_type: "terminal" }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hủy bỏ / Trả hàng" } : { ...fp });
        }
        steps[index] = { ...currentStep, has_branch: true, fail_path: newFailPath };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...currentStep, fail_path: [], has_branch: false };
        return { ...prev, steps };
      } else {
        const stepNum = parseInt(val);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Xử lý lỗi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: stepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: stepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        return { ...prev, steps };
      }
    });
  };

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
      const hasYes = step.transition && (step.transition.next_step !== null || step.transition.name);
      const hasNo = getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step !== null || getStepFailPath(step)[0].name);

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
              width: '150px',
              height: '150px',
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
              width: '115px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.62rem', backgroundColor: isSelected ? '#7B5233' : (isDecision ? '#d97706' : '#7c3aed'), color: 'white', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
                {step.assignee_role && (
                  <span style={{ fontSize: '0.55rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
                )}
              </div>
              
              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#1e293b', lineBreak: 'anywhere', maxWidth: '106px' }}>
                {step.name}
              </div>

              {/* Validation Badges inside diamond */}
              {isDecision && !hasYes && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu Yes</span>
              )}
              {isDecision && !hasNo && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu No</span>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '2px' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>

          {/* Quick Connection Controls for Decision */}
          {isDecision && (
            <div style={{ display: 'flex', gap: '8px', zIndex: 20, marginTop: '2px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#F0FDF4', border: '1px solid #b7ebc6', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Đúng:</span>
                <select
                  value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
                  onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #b7ebc6', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#FFF5F5', border: '1px solid #f8d7da', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Sai:</span>
                <select
                  value={getStepFailPath(step)[0]?.return_to_step === null && getStepFailPath(step)[0]?.name ? 'custom' : (getStepFailPath(step)[0]?.return_to_step || '')}
                  onChange={(e) => handleQuickFailPathChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #f8d7da', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>
            </div>
          )}

          {isCondition && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.68rem', color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginTop: '-4px', marginBottom: '4px' }}>
              <div>➔ Nhánh 1: B3</div>
              <div>➔ Nhánh 2: B4</div>
            </div>
          )}
        </div>
      );
    } else {
      const hasNext = step.transition && (step.transition.next_step !== null || step.transition.name);
      const isLastStep = idx === formData.steps.length - 1;

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
            
            {/* Validation Badge for Task */}
            {!hasNext && !isLastStep && (
              <span style={{ fontSize: '0.62rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚠️ Thiếu bước tiếp theo</span>
            )}

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

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ color: '#7B5233', fontWeight: 'bold' }}>➔ Bước tiếp:</span>
            <select
              value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
              onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.68rem', backgroundColor: 'white' }}
            >
              <option value="">-- Mặc định --</option>
              <option value="new_step">➕ Tạo bước mới...</option>
              <option value="custom">✍️ Tùy chỉnh...</option>
              {formData.steps.map((s, sidx) => (
                s.step_number !== step.step_number && (
                  <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                )
              ))}
            </select>
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    if (isProcessMode) {
      setCustomTitle('Quản lý quy trình');
      setCustomSubtitle(isEditMode ? 'Nhân sự - Chỉnh sửa Quy trình' : 'Nhân sự - Thêm mới Quy trình');
      setCustomScreenCode(isEditMode ? 'AD55' : 'AD18');
    } else {
      setCustomTitle('Quản lý mẫu tài liệu');
      setCustomSubtitle(isEditMode ? 'Nhân sự - Chỉnh sửa Mẫu ISO' : 'Nhân sự - Thêm mới Mẫu ISO');
      setCustomScreenCode(isEditMode ? 'AD17.1' : 'AD17');
    }

    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lấy nguyên danh sách sections từ parser – không thêm bớt
      const newSections = { ...(parsed.sections || {}) };
      const newSectionTypes = {};

      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      generateNextQTCode(isProcessMode).then(nextCode => {
        const parsedName = parsed.name || '';
        const isGenericName = isGenericNameText(parsedName);
        setFormData({
          id: null,
          code: nextCode,
          name: isGenericName ? '' : parsedName,
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          issuer: parsed.issuer || '',
          editor: loggedInUser.full_name || loggedInUser.username || '',
          approver: parsed.approver || '',
          owner: parsed.issuer || parsed.owner || '',
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiệu lực',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
            { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
          ],
          sections: newSections,
          template_sections: newSections,
          section_types: newSectionTypes,
          steps: (parsed.steps || []).map(step => ({
            ...step,
            node_type: step.transition?.node_type || step.node_type || 'task',
            has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
            fail_path: step.transition?.fail_path || step.fail_path || [],
            image_url: step.transition?.image_url || ''
          })),
          instruction_steps: (parsed.steps || []).map((step, idx) => ({
            id: `inst_${Date.now()}_${idx}`,
            step_number: step.step_number || (idx + 1),
            name: step.name || '',
            image_url: step.transition?.image_url || step.image_url || ''
          })),
          work_instructions: [{
            id: `inst_${Date.now()}`,
            code: `${nextCode}-HD01`,
            title: 'Hướng dẫn thực hiện quy trình',
            scope: 'Tất cả',
            note: '',
            steps: (parsed.steps || []).map((step, idx) => ({
              id: `step_${Date.now()}_${idx}`,
              step_number: step.step_number || (idx + 1),
              name: step.name || '',
              image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
            }))
          }]
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('print') === 'true' && formData.id && !loading && !autoPrintTriggered) {
      setShowPdfPreview(true);
      setAutoPrintTriggered(true);
    }
  }, [location.search, formData.id, loading, autoPrintTriggered]);

  useEffect(() => {
    if (showPdfPreview && autoPrintTriggered) {
      const timer = setTimeout(() => {
        handlePrintPdf();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showPdfPreview, autoPrintTriggered]);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const url = isProcessMode ? `/iso-documents/processes/${id}/details` : `/iso-documents/${id}/details`;
      const data = await api.get(url);
      
      const receivedSections = { ...(data.sections || {}) };
      let sectionTypes = {};

      if (receivedSections['__metadata_section_types__']) {
        try {
          sectionTypes = JSON.parse(receivedSections['__metadata_section_types__']);
        } catch (e) {
          console.error('Error parsing section types metadata:', e);
        }
        delete receivedSections['__metadata_section_types__'];
      }

      let instructionSteps = [];
      if (receivedSections['__metadata_instruction_steps__']) {
        try {
          instructionSteps = JSON.parse(receivedSections['__metadata_instruction_steps__']);
        } catch (e) {
          console.error('Error parsing instruction steps metadata:', e);
        }
        delete receivedSections['__metadata_instruction_steps__'];
      } else {
        instructionSteps = (data.steps || []).map((step, idx) => ({
          id: `inst_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_url: step.transition?.image_url || step.image_url || ''
        }));
      }

      let workInstructions = [];
      if (receivedSections['__metadata_work_instructions__']) {
        try {
          workInstructions = JSON.parse(receivedSections['__metadata_work_instructions__']);
        } catch (e) {
          console.error('Error parsing work instructions metadata:', e);
        }
        delete receivedSections['__metadata_work_instructions__'];
      } else {
        // Fallback: convert instructionSteps to workInstructions
        const convertedSteps = (instructionSteps && instructionSteps.length > 0 ? instructionSteps : (data.steps || [])).map((step, idx) => ({
          id: step.id || `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: step.image_urls || (step.image_url ? [step.image_url] : [])
        }));
        workInstructions = [{
          id: `inst_${Date.now()}`,
          title: 'Hướng dẫn thực hiện quy trình',
          steps: convertedSteps
        }];
      }

      // Sections được lấy nguyên từ DB – không merge thêm key cố định

      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          sectionTypes[key] = (key === 'Nội dung' && isProcessMode) ? 'flowchart' : 'text';
        }
      });

      setFormData({
        id: data.id,
        code: data.code || '',
        name: data.name || '',
        symbol: data.symbol || '',
        version: data.version || '01',
        issue_date: data.issue_date || '',
        issuer: data.issuer || '',
        approver: data.approver || '',
        file_path: data.file_path || '',
        status: data.status || 'Hiệu lực',
        folder: data.folder || data.display_at || '', 
        doc_type: data.doc_type || data.notes || '', 
        document_level: data.document_level || '',
        revision_logs: data.revision_logs || [],
        iso_document_id: data.iso_document_id || '',
        iso_document_code: data.iso_document_code || '',
        iso_document_name: data.iso_document_name || '',
        owner: data.owner || '',
        editor: data.editor || '',
        sections: receivedSections,
        template_sections: data.template_sections || {},
        section_types: sectionTypes,
        steps: (data.steps || []).map(step => ({
          ...step,
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || [],
          image_url: step.transition?.image_url || ''
        })),
        instruction_steps: instructionSteps,
        work_instructions: workInstructions
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

  const handleWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      return;
    }

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình mới...');

    try {
      const parsedData = await api.post('/iso-documents/upload', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newSections = parsedData.sections || {};
      const newSectionTypes = {};
      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsedData.section_types?.[key] || 'text';
      });

      const nextCode = formData.code || 'QT01';

      const stepsMapped = (parsedData.steps || []).map(step => ({
        ...step,
        node_type: step.transition?.node_type || step.node_type || 'task',
        has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
        fail_path: step.transition?.fail_path || step.fail_path || [],
        image_url: step.transition?.image_url || ''
      }));

      const instructionStepsMapped = (parsedData.steps || []).map((step, idx) => ({
        id: `inst_${Date.now()}_${idx}`,
        step_number: step.step_number || (idx + 1),
        name: step.name || '',
        image_url: step.transition?.image_url || step.image_url || ''
      }));

      const workInstructionsMapped = [{
        id: `inst_${Date.now()}`,
        code: `${nextCode}-HD01`,
        title: 'Hướng dẫn thực hiện quy trình',
        scope: 'Tất cả',
        note: '',
        steps: (parsedData.steps || []).map((step, idx) => ({
          id: `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
        }))
      }];

      setFormData(prev => ({
        ...prev,
        name: (parsedData.name && parsedData.name.trim() !== '[Tên quy trình]' && parsedData.name.trim() !== 'Tên quy trình' && parsedData.name.trim() !== '[Tên tài liệu]' && parsedData.name.trim() !== 'Tên tài liệu') ? parsedData.name : prev.name,
        symbol: parsedData.symbol || prev.symbol,
        version: parsedData.version || prev.version || '01',
        file_path: parsedData.file_path || prev.file_path,
        folder: parsedData.folder || prev.folder,
        doc_type: parsedData.doc_type || prev.doc_type,
        document_level: parsedData.document_level || prev.document_level,
        notes: parsedData.notes || prev.notes,
        owner: parsedData.issuer || parsedData.owner || prev.owner,
        approver: parsedData.approver || prev.approver,
        sections: newSections,
        template_sections: newSections,
        section_types: newSectionTypes,
        steps: stepsMapped,
        instruction_steps: instructionStepsMapped,
        work_instructions: workInstructionsMapped
      }));

      showFeedback('success', 'Cập nhật cấu trúc tài liệu quy trình từ file Word thành công! Vui lòng ấn "Lưu quy trình" để hoàn tất.');
    } catch (error) {
      console.error('Lỗi upload file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình mới';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
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

  const getSectionHint = (sectionKey) => {
    const templateHtml = formData.template_sections?.[sectionKey] || '';
    if (!templateHtml) return null;
    const cleanText = templateHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanText) return null;
    const match = cleanText.match(/\[([^\]]*)\]/);
    return match ? match[1].trim() : cleanText;
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

  const handleAddInstructionStep = () => {
    const nextStepNum = (formData.instruction_steps || []).length + 1;
    const newStep = {
      id: `inst_${Date.now()}`,
      step_number: nextStepNum,
      name: '',
      image_url: ''
    };
    setFormData(prev => ({
      ...prev,
      instruction_steps: [...(prev.instruction_steps || []), newStep]
    }));
  };

  const handleUpdateInstructionStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...(prev.instruction_steps || [])];
      if (nextSteps[index]) {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleRemoveInstructionStep = (index) => {
    setFormData(prev => {
      const nextSteps = (prev.instruction_steps || []).filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1 }));
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleInstructionImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateInstructionStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Work Instructions CRUD & Image Helpers
  const handleAddWorkInstruction = () => {
    const processCode = formData.code || 'G7.SX.QT01';
    const prefix = `${processCode}-HD`;
    let maxAa = 0;
    if (formData.work_instructions && formData.work_instructions.length > 0) {
      formData.work_instructions.forEach(inst => {
        const c = inst.code || '';
        if (c.toUpperCase().startsWith(prefix.toUpperCase())) {
          const suffix = c.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxAa) {
            maxAa = num;
          }
        }
      });
    }
    const aa = String(maxAa + 1).padStart(2, '0');
    const generatedCode = `${prefix}${aa}`;

    const newInst = {
      id: `inst_${Date.now()}`,
      code: generatedCode,
      title: `hướng dẫn ${maxAa + 1}`,
      scope: 'Tất cả',
      note: '',
      steps: []
    };
    
    setFormData(prev => ({
      ...prev,
      work_instructions: [...(prev.work_instructions || []), newInst]
    }));
    setSelectedInstructionId(newInst.id);
  };

  const handleUpdateWorkInstructionTitle = (id, newTitle) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, title: newTitle };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionScope = (id, newScope) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, scope: newScope };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionNote = (id, newNote) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, note: newNote };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleRemoveWorkInstruction = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hướng dẫn này cùng toàn bộ các bước và hình ảnh?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).filter(inst => inst.id !== id);
        return { ...prev, work_instructions: nextInstructions };
      });
      if (selectedInstructionId === id) {
        setSelectedInstructionId(null);
      }
    }
  };

  const handleOpenAddStepPopup = (activeInst) => {
    const nextNum = (activeInst.steps || []).length + 1;
    setStepForm({
      id: `step_${Date.now()}_${nextNum}`,
      step_number: nextNum,
      name: '',
      note: '',
      standard: '',
      image_url: ''
    });
    setIsEditingStep(false);
    setEditingStepIdx(-1);
    setShowStepPopup(true);
  };

  const handleOpenEditStepPopup = (activeInst, idx) => {
    const step = activeInst.steps[idx];
    if (step) {
      setStepForm({
        id: step.id || `step_${Date.now()}_${step.step_number}`,
        step_number: step.step_number,
        name: step.name || '',
        note: step.note || '',
        standard: step.standard || '',
        image_url: step.image_url || ''
      });
      setIsEditingStep(true);
      setEditingStepIdx(idx);
      setShowStepPopup(true);
    }
  };

  const handleSaveStep = (e) => {
    e.preventDefault();
    if (!selectedInstructionId) return;
    
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];
          if (isEditingStep && editingStepIdx >= 0) {
            nextSteps[editingStepIdx] = { ...stepForm };
          } else {
            const insertIdx = stepForm.step_number - 1;
            nextSteps.splice(insertIdx, 0, { ...stepForm });
          }
          nextSteps = nextSteps.map((s, idx) => ({ ...s, step_number: idx + 1 }));
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
    
    setShowStepPopup(false);
  };

  const handleRemoveWorkInstructionStep = (instId, stepIdx) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bước này?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).map(inst => {
          if (inst.id === instId) {
            const nextSteps = (inst.steps || []).filter((_, idx) => idx !== stepIdx)
              .map((step, idx) => ({ ...step, step_number: idx + 1 }));
            return { ...inst, steps: nextSteps };
          }
          return inst;
        });
        return { ...prev, work_instructions: nextInstructions };
      });
    }
  };

  const handleReorderStepInPopup = (targetStepNo) => {
    const targetIdx = parseInt(targetStepNo, 10) - 1;
    if (isNaN(targetIdx) || targetIdx < 0) return;
    
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];
          
          if (isEditingStep && editingStepIdx >= 0) {
            const currentIdx = editingStepIdx;
            if (currentIdx === targetIdx) return inst;
            
            const [movedStep] = nextSteps.splice(currentIdx, 1);
            nextSteps.splice(targetIdx, 0, movedStep);
            nextSteps = nextSteps.map((s, i) => ({ ...s, step_number: i + 1 }));
            
            setEditingStepIdx(targetIdx);
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          } else {
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          }
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handlePopupImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setStepForm(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const handlePrintPdf = () => {
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Trình duyệt chặn mở cửa sổ mới. Vui lòng cho phép popup để xuất PDF.");
      return;
    }

    let htmlContent = previewEl.innerHTML;
    // Replace relative image paths with absolute paths so they load on about:blank base
    const origin = window.location.origin;
    htmlContent = htmlContent.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="assets\//g, `src="${origin}/assets/`);

    printWindow.document.write(`
      <html>
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm 20mm 15mm;
            }
            * {
              font-family: "Times New Roman", Times, serif !important;
            }
            body {
              color: black;
              background-color: white;
              line-height: 1.5;
              font-size: 12pt;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
            .a4-page {
              width: 100% !important;
              min-height: unset !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-after: always !important;
            }
            .a4-page:last-child {
              page-break-after: avoid !important;
            }
            .cover-border-box {
              border: 2px solid black;
              padding: 24px;
              height: 250mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              flex: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              vertical-align: middle;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
            }
            th {
              background-color: #f8fafc !important;
            }
            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              border-bottom: 1px solid black;
              padding-bottom: 2px;
              page-break-after: avoid;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
              page-break-after: avoid;
            }
            img {
              max-width: 100%;
              height: auto;
              object-fit: cover;
            }
            .instruction-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .instruction-card {
              border: 1px solid black;
              padding: 10px;
              display: flex;
              flex-direction: column;
              gap: 8px;
              page-break-inside: avoid;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                background: none;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const svgToPngDataUrl = (svgElement) => {
    return new Promise((resolve) => {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = svgElement.viewBox?.baseVal?.width || svgElement.width?.baseVal?.value || 860;
          const height = svgElement.viewBox?.baseVal?.height || svgElement.height?.baseVal?.value || 800;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(pngUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch (e) {
        resolve(null);
      }
    });
  };

  const handleDownloadDoc = async () => {
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    // Clone the DOM so we can manipulate it (replacing SVGs with PNGs for Word compat)
    const clone = previewEl.cloneNode(true);
    
    // Find all SVGs (e.g. the flowchart table) and replace them with high-res PNG images
    const svgEl = clone.querySelector("svg");
    if (svgEl) {
      const originalSvg = previewEl.querySelector("svg");
      const pngUrl = await svgToPngDataUrl(originalSvg);
      if (pngUrl) {
        const img = document.createElement("img");
        img.src = pngUrl;
        img.setAttribute("width", "680");
        img.style.width = "680px";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "0 auto";
        svgEl.parentNode.replaceChild(img, svgEl);
      }
    }

    // Recursively strip flexbox styles that break Word layout
    const cleanFlexboxStyles = (element) => {
      if (element.style) {
        if (element.style.display === 'flex') {
          element.style.display = 'block';
        }
        element.style.flex = '';
        element.style.flexDirection = '';
        element.style.justifyContent = '';
        element.style.alignItems = '';
        element.style.flexWrap = '';
        element.style.flexGrow = '';
        element.style.flexShrink = '';
        element.style.flexBasis = '';
      }
      Array.from(element.children).forEach(child => cleanFlexboxStyles(child));
    };
    cleanFlexboxStyles(clone);

    // Also look for other elements with page-break-before: always inside the document
    // and replace them with a standard paragraph page break before them
    const breakElms = clone.querySelectorAll('*');
    breakElms.forEach(el => {
      if (el.style && el.style.pageBreakBefore === 'always') {
        el.style.pageBreakBefore = ''; // Remove from element to avoid duplicate break
        const br = document.createElement("p");
        br.style.pageBreakBefore = "always";
        br.style.clear = "both";
        br.innerHTML = "&nbsp;";
        el.parentNode.insertBefore(br, el);
      }
    });

    // Extract pages flat inner contents
    const pages = clone.querySelectorAll(".a4-page");
    const pageContents = [];
    pages.forEach((page) => {
      const coverBox = page.querySelector(".cover-border-box");
      if (coverBox) {
        // MS Word ignores borders on div elements. We must replace the cover page border div
        // with a 1x1 table cell that has a solid border.
        const table = document.createElement("table");
        table.className = "cover-border-box-table";
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.border = "1.5pt solid windowtext";
        
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.style.border = "none";
        td.style.padding = "24px";
        
        // Move all children of coverBox into td
        while (coverBox.firstChild) {
          td.appendChild(coverBox.firstChild);
        }
        
        tr.appendChild(td);
        table.appendChild(tr);
        
        coverBox.parentNode.replaceChild(table, coverBox);
      }
      pageContents.push(page.innerHTML);
    });

    // Join pages with a clean paragraph break (standard for MS Word HTML)
    let html = pageContents.join('\n<p style="page-break-before:always; clear:both; mso-break-type:section-break">&nbsp;</p>\n');

    // Ensure relative assets are resolved with absolute web origin paths
    const origin = window.location.origin;
    html = html.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="assets\//g, `src="${origin}/assets/`);

    const documentHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt; /* A4 width/height in points */
              margin: 1.0in 1.0in 1.0in 1.0in; /* 2.54cm standard margins */
              mso-header-margin: 36.0pt;
              mso-footer-margin: 36.0pt;
              mso-paper-source: 0;
            }
            div.Section1 {
              page: Section1;
            }
            body, p, span, div, table, tr, td, th, h1, h2, h3, h4, h5, h6 {
              font-family: "Times New Roman", Times, serif !important;
            }
            body {
              font-size: 12pt;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            th, td {
              border: 1.0pt solid windowtext;
              mso-border-alt: 0.5pt solid windowtext;
              padding: 8px;
              vertical-align: middle;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
            }
            table.header-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              margin-bottom: 20px !important;
            }
            table.header-table td {
              border: none !important;
              mso-border-alt: none !important;
              padding: 10px !important;
            }
            table.header-table td.header-logo-cell {
              border-right: 1.5pt solid windowtext !important;
              mso-border-alt: right solid windowtext 1.5pt !important;
            }
            table.dashed-table {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              margin: 0 auto 20px auto !important;
            }
            table.dashed-table td {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              padding: 8px !important;
            }
            table.cover-border-box-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 0 !important;
            }
            table.cover-border-box-table td {
              border: none !important;
              mso-border-alt: none !important;
              padding: 18pt !important;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
              mso-border-alt: none !important;
            }
            .word-only-spacer {
              display: block !important;
              height: 40pt !important;
              line-height: 40pt !important;
            }
            .word-only-spacer2 {
              display: block !important;
              height: 120pt !important;
              line-height: 120pt !important;
            }
            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              border-bottom: 1.0pt solid windowtext;
              padding-bottom: 2px;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
            }
            .instruction-grid {
              width: 100%;
            }
            .instruction-card {
              border: 1.0pt solid windowtext;
              padding: 10px;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${html}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\\ufeff' + documentHtml], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.code || 'ISO'}_${formData.name || 'Quy_trinh'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAutoLayoutClassic = useCallback(() => {
    const steps = formData.steps || [];
    if (steps.length === 0) return;

    // 1. Get unique roles in order of appearance
    const uniqueRoles = [];
    steps.forEach(s => {
      const role = s.assignee_role || "";
      if (role && !uniqueRoles.includes(role)) {
        uniqueRoles.push(role);
      }
    });
    if (uniqueRoles.length === 0) {
      uniqueRoles.push("");
    }

    // 2. Identify sidesteps (fail paths)
    const getSidesteps = () => {
      const sidesteps = new Set();
      steps.forEach(s => {
        if (s.node_type === 'decision') {
          const failPath = s.fail_path || [];
          const noStepNum = failPath[0]?.return_to_step;
          if (noStepNum) {
            sidesteps.add(noStepNum);
            let current = noStepNum;
            while (current) {
              const currStep = steps.find(st => String(st.step_number) === String(current));
              const next = currStep?.transition?.next_step || currStep?.next_step;
              if (next && String(next) !== String(current) && !steps.some(st => String(st.step_number) === String(next) && st.node_type === 'decision')) {
                sidesteps.add(next);
                current = next;
              } else break;
            }
          }
        }
      });
      return sidesteps;
    };

    const sidesteps = getSidesteps();
    const mainSteps = steps.filter(s => !sidesteps.has(s.step_number));
    const positions = {};

    const getNodeDimensions = (nodeType) => {
      if (nodeType === "decision") return { width: 86, height: 86 };
      if (nodeType === "terminal") return { width: 120, height: 44 };
      return { width: 140, height: 54 }; // task
    };

    // 3. Lay out main steps vertically
    mainSteps.forEach((step, idx) => {
      const role = step.assignee_role || "";
      const roleIdx = uniqueRoles.indexOf(role);
      const colCenter = 300 + (roleIdx >= 0 ? roleIdx : 0) * 280;

      const { width } = getNodeDimensions(step.node_type);
      positions[step.step_number] = {
        x: colCenter - width / 2,
        y: 60 + idx * 140
      };
    });

    // 4. Lay out sidesteps to the left column relative to their parent decision step
    mainSteps.forEach((step, idx) => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum && sidesteps.has(noStepNum)) {
          const parentY = positions[step.step_number]?.y || (60 + idx * 140);
          const parentRole = step.assignee_role || "";
          const parentRoleIdx = uniqueRoles.indexOf(parentRole);
          const colCenter = 300 + (parentRoleIdx >= 0 ? parentRoleIdx : 0) * 280;
          const sideCenter = colCenter - 180;
          
          const firstStep = steps.find(st => st.step_number === noStepNum);
          let startY = parentY;
          if (firstStep) {
            const { height: childHeight } = getNodeDimensions(firstStep.node_type);
            startY = parentY + 43 - childHeight / 2;
          }

          let current = noStepNum;
          let chainIdx = 0;
          const visited = new Set();
          
          while (current && !visited.has(current)) {
            visited.add(current);
            const currStep = steps.find(st => st.step_number === current);
            if (currStep) {
              const { width } = getNodeDimensions(currStep.node_type);
              positions[current] = {
                x: sideCenter - width / 2,
                y: startY + chainIdx * 130
              };
            }
            
            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && sidesteps.has(next)) {
              current = next;
              chainIdx++;
            } else {
              break;
            }
          }
        }
      }
    });

    // 5. Update steps
    setFormData(prev => {
      const nextSteps = prev.steps.map(s => {
        const pos = positions[s.step_number];
        if (pos) {
          return { ...s, x_pos: pos.x, y_pos: pos.y };
        }
        return s;
      });
      return { ...prev, steps: nextSteps };
    });
  }, [formData.steps]);

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
    if (!formData.code) {
      showFeedback('error', 'Mã quy trình không được để trống');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      showFeedback('error', 'Tên quy trình là bắt buộc');
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

      const flattenedInstructionSteps = (formData.work_instructions?.[0]?.steps || []).map(step => ({
        id: step.id,
        step_number: step.step_number,
        name: step.name,
        image_url: step.image_urls?.[0] || ''
      }));

      const finalPayload = {
        ...formData,
        editor: loggedInUser.full_name || loggedInUser.username || formData.editor || '',
        issuer: loggedInUser.full_name || loggedInUser.username || formData.issuer || '',
        display_at: formData.folder,
        notes: formData.doc_type,
        steps: stepsToSave,
        diagram_data: JSON.stringify({ nodes, links }),
        sections: {
          ...(formData.sections || {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {}),
          '__metadata_instruction_steps__': JSON.stringify(flattenedInstructionSteps),
          '__metadata_work_instructions__': JSON.stringify(formData.work_instructions || [])
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
  const isStepSelected = selectedStepIdx !== -1 && selectedStepIdx !== null && selectedStepIdx !== undefined && formData.steps && formData.steps[selectedStepIdx];
  const isFlowchartActive = activeTab === 'content' && formData.section_types?.[activeMenu] === 'flowchart';

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
          
          {/* Card: Thông tin quy trình - Có thể thu gọn/mở rộng */}
          <div style={{ ...cardStyle, overflow: 'visible' }}>
            <div 
              style={{ ...headerStyle, borderTopLeftRadius: '5px', borderTopRightRadius: '5px', cursor: 'pointer' }}
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              <span style={headerTextStyle}>{isProcessMode ? 'Thông tin quy trình' : 'Thông tin Mẫu ISO'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPdfPreview(true);
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4A301C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={13} />
                  Xuất tài liệu
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveForm();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4A301C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Lưu hồ sơ
                </button>
                <div style={{ width: '1px', height: '18px', backgroundColor: '#EADCC9', margin: '0 4px' }} />
                {infoExpanded ? <ChevronUp size={16} style={{color:accentColor}} /> : <ChevronDown size={16} style={{color:accentColor}} />}
              </div>
            </div>

            {infoExpanded && (
              <div style={{ padding: '20px', borderTop: '1px solid #F0E6D8', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px 16px' }}>
                  
                  {/* Row 1 */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã QT</label>
                    <input
                      type="text"
                      value={formData.code}
                      readOnly
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 5' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên quy trình <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nhập tên quy trình..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937' }}
                    >
                      <option value="Nháp">Nháp</option>
                      <option value="Dự thảo">Dự thảo</option>
                      <option value="Hiệu lực">Đang hoạt động</option>
                      <option value="Hết hiệu lực">Hết hiệu lực</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 3', position: 'relative' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phạm vi</label>
                    <div 
                      onClick={() => setIsScreenDropdownOpen(!isScreenDropdownOpen)}
                      style={{ 
                        width: '100%', 
                        minHeight: '36px', 
                        padding: '6px 12px', 
                        border: '1px solid #D1D5DB', 
                        borderRadius: '6px', 
                        fontSize: '0.82rem', 
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      {(() => {
                        const selectedScreens = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (selectedScreens.length === 0) {
                          return <span style={{ color: '#94a3b8' }}>Chọn phạm vi...</span>;
                        }
                        return selectedScreens.map(scrPath => {
                          const scrObj = systemScreens.find(s => s.route_path === scrPath);
                          const label = scrObj ? `${scrObj.title} (${scrObj.route_path})` : scrPath;
                          return (
                            <span 
                              key={scrPath}
                              style={{ 
                                backgroundColor: '#FAF6F0', 
                                color: '#7B5233', 
                                border: '1px solid #7B5233',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {label}
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleScreen(scrPath);
                                }}
                                style={{ cursor: 'pointer', fontWeight: '900' }}
                              >
                                ×
                              </span>
                            </span>
                          );
                        });
                      })()}
                    </div>

                    {isScreenDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '240px',
                        overflowY: 'auto',
                        backgroundColor: 'white',
                        border: '1.5px solid #EADCC9',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(45, 26, 18, 0.08)',
                        zIndex: 1000,
                        marginTop: '4px',
                        padding: '6px'
                      }}>
                        <div style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid #FAF6F0', marginBottom: '4px' }}>
                          Chọn màn hình:
                        </div>
                        {systemScreens.length === 0 ? (
                          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Đang tải màn hình...
                          </div>
                        ) : (
                          (() => {
                            const selectedScreens = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
                            const mobileScreens = systemScreens.filter(scr => 
                              scr.platform && 
                              scr.platform.toLowerCase() === 'mobile' && 
                              ((scr.route_path || '').toLowerCase().includes('inspection') || 
                               (scr.title || '').toLowerCase().includes('kiểm tra'))
                            );
                            return mobileScreens.map(scr => {
                              const isSelected = selectedScreens.includes(scr.route_path);
                              return (
                                <div
                                  key={scr.id}
                                  onClick={() => handleToggleScreen(scr.route_path)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FAF8F5';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    readOnly
                                    style={{ accentColor: '#7B5233', cursor: 'pointer' }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#7B5233' : '#334155' }}>
                                      {scr.title || 'Màn hình'}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      [{scr.platform}] {scr.route_path}
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2 */}
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người soạn</label>
                    <input
                      type="text"
                      value={formData.owner || loggedInUser.full_name || loggedInUser.username || ''}
                      readOnly
                      placeholder="Chưa có người soạn..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người duyệt</label>
                    <input
                      type="text"
                      value={formData.approver || ''}
                      onChange={(e) => handleInputChange('approver', e.target.value)}
                      placeholder="Nhập người duyệt..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cấp tài liệu</label>
                    <input
                      type="text"
                      value={formData.document_level || ''}
                      onChange={(e) => handleInputChange('document_level', e.target.value)}
                      placeholder="Nhập cấp tài liệu..."
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người cập nhật cuối cùng</label>
                    <input
                      type="text"
                      value={loggedInUser.full_name || loggedInUser.username || formData.editor || formData.issuer || '---'}
                      readOnly
                      style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Row 3: Ghi chú */}
                  <div style={{ gridColumn: 'span 12' }}>
                    <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ghi chú</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Nhập ghi chú hoặc mô tả ngắn cho quy trình..."
                      rows={3}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#1F2937', lineHeight: '1.4' }}
                    />
                  </div>

                </div>
              </div>
            )}
        </div>

          {/* Tab Bar Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #EADCC9',
            marginTop: '12px',
            marginBottom: '16px',
            gap: '4px'
          }}>
            {[
              { id: 'content', label: 'Nội dung Quy trình', icon: FileText },
              { id: 'instructions', label: 'Hướng dẫn thực hiện', icon: Activity },
              { id: 'templates', label: 'Tài liệu liên quan', icon: ListPlus },
              { id: 'history', label: 'Lịch sử kiểm tra', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentScreen('overview');
                    if (tab.id === 'instructions') {
                      const instructions = formData.work_instructions || [];
                      if (instructions.length > 0 && !selectedInstructionId) {
                        setSelectedInstructionId(instructions[0].id);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: '1px solid #EADCC9',
                    borderBottom: isActive ? '2px solid white' : '1px solid #EADCC9',
                    backgroundColor: isActive ? 'white' : '#FAF6F0',
                    color: isActive ? '#7B5233' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#FAF0E6';
                      e.currentTarget.style.color = '#7B5233';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#FAF6F0';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Card: Nội dung quy trình - Hiển thị trực tiếp split view left TOC + right editor/flowchart (Ảnh 2) */}
          {activeTab === 'content' && (
            <div style={cardStyle}>
            <div style={{ ...headerStyle, cursor: 'default' }}>
              <span style={headerTextStyle}>Nội dung quy trình</span>
              <button 
                type="button"
                onClick={() => setShowPdfPreview(true)}
                style={{ padding: '4px 12px', backgroundColor: '#7B5233', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight:'bold', cursor:'pointer' }}
              >
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
                {Object.keys(formData.sections || {})
                  .filter(key => !key.startsWith('__'))
                  .map((sectionId, sIdx) => {
                  const isSelected = activeMenu === sectionId;
                  const currentType = formData.section_types?.[sectionId] || 'text';
                  return (
                    <div
                      key={sIdx}
                      onClick={() => {
                        setActiveMenu(sectionId);
                        if (formData.section_types?.[sectionId] === 'flowchart') {
                          setInfoExpanded(false);
                        } else {
                          setInfoExpanded(true);
                        }
                      }}
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
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{`${sIdx + 1}. ${sectionId}`}</span>
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
                        gridTemplateColumns: isStepSelected ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1fr',
                        alignItems: 'stretch'
                      }}>
{/* Left Side: ReactFlow Flowchart Canvas column */}
                        <div style={{
                          borderRight: isStepSelected ? `1.5px solid ${cardBorderColor}` : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '700px',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}>
                          {/* Segmented Control Mode Toggle */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: '#F8FAFC',
                            borderBottom: '1px solid #cbd5e1',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Activity size={14} style={{ color: '#7B5233' }} /> Chế độ thiết kế lưu trình
                            </span>

                            {/* Auto Layout Button inside header */}
                            <button
                              type="button"
                              onClick={() => {
                                if (flowchartMode === 'canvas') {
                                  flowchartCanvasRef.current?.triggerAutoLayout();
                                } else {
                                  handleAutoLayoutClassic();
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                border: '1.5px solid #7B5233',
                                backgroundColor: 'white',
                                color: '#7B5233',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#FAF6F0';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                              }}
                            >
                              ✨ Sắp xếp tự động
                            </button>

                            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <button
                                type="button"
                                onClick={() => handleSetFlowchartMode('canvas')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: flowchartMode === 'canvas' ? 'white' : 'transparent',
                                  color: flowchartMode === 'canvas' ? '#7B5233' : '#64748b',
                                  boxShadow: flowchartMode === 'canvas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                              >
                                🗺️ Kéo thả
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFlowchartMode('classic')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: flowchartMode === 'classic' ? 'white' : 'transparent',
                                  color: flowchartMode === 'classic' ? '#7B5233' : '#64748b',
                                  boxShadow: flowchartMode === 'classic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                              >
                                🗂️ Dạng danh sách
                              </button>
                            </div>
                          </div>

                          {flowchartMode === 'canvas' ? (
                            <FlowchartCanvas
                              ref={flowchartCanvasRef}
                              steps={formData.steps}
                              selectedStepIdx={selectedStepIdx}
                              onPositionsChange={handlePositionsChange}
                              onAddStep={handleAddStepFromCanvas}
                              onUpdateStep={handleUpdateStep}
                              onDeleteStep={handleRemoveStep}
                              onNodeSelect={handleNodeSelect}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              flex: 1,
                              border: 'none',
                              backgroundColor: '#F8FAFC',
                              maxHeight: '700px',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}>
                              {/* Visual Flowchart Canvas (Scrollable) */}
                              <div style={{
                                width: '100%',
                                flex: 1,
                                padding: '24px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'auto'
                              }}>
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
                                    paddingLeft: `${(maxLeftChainLength * 270) + 40}px`,
                                    paddingRight: `${(maxLeftChainLength * 270) + 40}px`,
                                    margin: '0 auto'
                                  }}
                                >
                                  <FlowchartConnectors steps={formData.steps} zoomScale={zoomScale} />
                                  {formData.steps.length === 0 ? (
                                    <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                      <span>Chưa có bước nào. Click nút "Thêm bước mới" để bắt đầu thiết lập.</span>
                                      <button
                                        type="button"
                                        onClick={handleAddStep}
                                        style={{
                                          padding: '8px 20px',
                                          backgroundColor: '#7B5233',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '0.8rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.2)'
                                        }}
                                      >
                                        <Plus size={14} /> Thêm bước mới
                                      </button>
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
                                            const currStep = formData.steps.find(s => String(s.step_number) === String(current));
                                            if (currStep) {
                                              chain.push(currStep);
                                              current = currStep.transition?.next_step || currStep.next_step;
                                              if (mainSteps.some(ms => ms.step_number === current)) break;
                                            } else break;
                                          }
                                        }
                                        return (
                                          <React.Fragment key={step.step_number}>
                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 'max-content', justifyContent: 'center' }}>
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
                                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 'max-content', justifyContent: 'center' }}>
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
                                </div>
                              </div>

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

                              {/* Floating "Thêm bước mới" Button - Always fixed in the bottom-left corner of the workspace area */}
                              {formData.steps.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleAddStep}
                                  style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '12px',
                                    padding: '8px 16px',
                                    backgroundColor: '#7B5233',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(123, 82, 51, 0.3)',
                                    zIndex: 30,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#623f25';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#7B5233';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  <Plus size={14} /> Thêm bước mới
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Side: Step Details Editor */}
                        {isStepSelected && (
                          <div style={{
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflowY: 'auto',
                            maxHeight: '700px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EADCC9', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>Cấu hình thuộc tính bước</span>
                              <button
                                type="button"
                                onClick={() => setSelectedStepIdx(-1)}
                                style={{
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                ✕ Đóng
                              </button>
                            </div>
                            {formData.steps[selectedStepIdx] && (
                              <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1.8fr', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bước:</label>
                                  <select
                                    value={selectedStepIdx}
                                    onChange={(e) => setSelectedStepIdx(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    {formData.steps.map((s, idx) => (
                                      <option key={idx} value={idx}>{(stepDisplayLabels[s.step_number] || ('B' + s.step_number)).replace(/^B/, 'Bước ')}: {s.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Kiểu bước:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].node_type || 'task'}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'node_type', e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white', fontWeight: 'bold', color: '#7B5233' }}
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
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    <option value="Kho">Bộ phận Kho</option>
                                    <option value="QC">Bộ phận QC / QLCL</option>
                                    <option value="Sản xuất">Bộ phận Sản xuất</option>
                                    <option value="Thu mua">Bộ phận Thu mua</option>
                                    <option value="Bán hàng">Bộ phận Bán hàng</option>
                                    <option value="Admin">Ban Giám Đốc</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tiêu đề công việc:</label>
                                  <input
                                    type="text"
                                    value={formData.steps[selectedStepIdx].name || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>Bản soạn thảo (Giải thích chi tiết bước):</label>
                                <RichTextEditor
                                  value={formData.steps[selectedStepIdx].instructions || ''}
                                  onChange={(val) => handleUpdateStep(selectedStepIdx, 'instructions', val)}
                                  placeholder="Nhập hướng dẫn, giải thích các bước chi tiết tại đây..."
                                  style={{ minHeight: '160px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
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
                                      <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
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
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bảng/Danh sách hướng dẫn chi tiết các bước (Ảnh 2) */}
                    <div 
                      id="steps-explanation-preview"
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: `1.5px solid ${cardBorderColor}`,
                        boxShadow: '0 4px 16px rgba(123, 82, 51, 0.05)',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '16px'
                      }}
                    >
                      <div 
                        onClick={() => setExplanationExpanded(!explanationExpanded)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          borderBottom: explanationExpanded ? '2px solid #EADCC9' : 'none',
                          paddingBottom: explanationExpanded ? '8px' : '0',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <h3 style={{
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          color: accentColor,
                          margin: 0,
                          textTransform: 'uppercase'
                        }}>
                          Giải thích chi tiết các bước quy trình
                        </h3>
                        {explanationExpanded ? (
                          <ChevronUp size={16} style={{ color: accentColor }} />
                        ) : (
                          <ChevronDown size={16} style={{ color: accentColor }} />
                        )}
                      </div>

                      {explanationExpanded && (
                        <div style={{
                          fontFamily: '"Times New Roman", Times, serif',
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                          color: '#000000',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          marginTop: '16px'
                        }}>
                          {formData.steps && formData.steps.length > 0 ? (
                            formData.steps.map((step, idx) => {
                              const stepLabel = (stepDisplayLabels[step.step_number] || '').replace(/^B/, 'Bước ') || `Bước ${step.step_number}`;
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '1rem', color: '#000000' }}>
                                    {stepLabel}: {step.name}
                                  </div>
                                  {step.instructions ? (
                                    <div 
                                      dangerouslySetInnerHTML={{ __html: step.instructions }} 
                                      style={{ paddingLeft: '16px', color: '#000000' }}
                                    />
                                  ) : (
                                    <div style={{ paddingLeft: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                      (Chưa có giải thích cho bước này)
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                              Chưa có bước nào trong quy trình.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* RENDER RICH TEXT EDITOR */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {(() => {
                      const hint = getSectionHint(activeMenu);
                      if (!hint) return null;
                      return (
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          color: '#1E40AF',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          lineHeight: '1.4'
                        }}>
                          <span style={{ fontSize: '1rem', lineHeight: '1' }}>💡</span>
                          <div>
                            <strong>Gợi ý từ tài liệu mẫu:</strong> {hint}
                          </div>
                        </div>
                      );
                    })()}
                    <RichTextEditor
                      value={formData.sections[activeMenu] || ''}
                      onChange={(val) => handleSectionChange(activeMenu, val)}
                      placeholder={getSectionHint(activeMenu) || `Nhập nội dung cho phần: ${activeMenu}...`}
                      style={{ flex: 1, minHeight: '420px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Tab 2: Hướng dẫn thực hiện - hiển thị trực tiếp dạng 2 cột */}
          {activeTab === 'instructions' && isProcessMode && (() => {
            const activeInst = (formData.work_instructions || []).find(inst => inst.id === selectedInstructionId);
            return (
              <div style={{ display: 'flex', gap: '20px', width: '100%', minHeight: '60vh', boxSizing: 'border-box' }}>
                {/* Cột trái: Danh sách hướng dẫn */}
                <div style={{ width: '22%', minWidth: '200px', backgroundColor: 'white', borderRadius: '10px', padding: '16px', border: '1.5px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
                  <h3 style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Danh sách hướng dẫn
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                    {(formData.work_instructions || []).length === 0 ? (
                      <div style={{ padding: '20px 10px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.82rem' }}>
                        Chưa có hướng dẫn nào
                      </div>
                    ) : (
                      (formData.work_instructions || []).map((inst, idx) => {
                        const isActive = inst.id === selectedInstructionId;
                        const codePart = inst.code ? inst.code.split('-').pop() : `HD${String(idx + 1).padStart(2, '0')}`;
                        const label = `${codePart} - ${inst.title || `hướng dẫn ${idx + 1}`}`;
                        return (
                          <div
                            key={inst.id}
                            onClick={() => setSelectedInstructionId(inst.id)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              backgroundColor: isActive ? '#FAF6F0' : 'transparent',
                              color: isActive ? '#7B5233' : '#374151',
                              fontWeight: isActive ? 'bold' : 'normal',
                              border: isActive ? '1.5px solid #7B5233' : '1.5px solid transparent',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              transition: 'all 0.2s',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                              {label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveWorkInstruction(inst.id);
                              }}
                              style={{
                                border: 'none',
                                background: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                opacity: 0.6,
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0
                              }}
                              title="Xóa hướng dẫn"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddWorkInstruction}
                    style={{
                      width: '100%',
                      padding: '9px',
                      backgroundColor: 'white',
                      border: '1.5px dashed #7B5233',
                      color: '#7B5233',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Plus size={14} /> Thêm hướng dẫn mới
                  </button>
                </div>

                {/* Cột phải: Chi tiết hướng dẫn đang chọn */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                  {!activeInst ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px 20px', border: '1.5px solid #EADCC9', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.88rem' }}>
                      {(formData.work_instructions || []).length === 0
                        ? 'Vui lòng thêm hướng dẫn mới ở cột bên trái để bắt đầu.'
                        : 'Chọn một hướng dẫn ở cột bên trái để xem chi tiết.'}
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>Hướng dẫn kiểm tra</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setShowPdfPreview(true)}
                            style={{
                              padding: '7px 18px',
                              backgroundColor: '#5C3D24',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4A301C'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5C3D24'}
                          >
                            Xem trước
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('content');
                            }}
                            style={{
                              padding: '7px 18px',
                              backgroundColor: 'white',
                              color: '#374151',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Quay lại
                          </button>
                        </div>
                      </div>

                      {/* Form chi tiết */}
                      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', border: '1.5px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
                        {/* Hàng 1: Mã tài liệu, Tên tài liệu, Phạm vi áp dụng */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr', gap: '14px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Mã tài liệu
                            </label>
                            <input
                              type="text"
                              value={activeInst.code || ''}
                              readOnly
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                outline: 'none',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                backgroundColor: '#F3F4F6',
                                color: '#4B5563',
                                cursor: 'not-allowed',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Tên tài liệu
                            </label>
                            <input
                              type="text"
                              value={activeInst.title || ''}
                              onChange={(e) => handleUpdateWorkInstructionTitle(activeInst.id, e.target.value)}
                              placeholder="Nhập tên tài liệu..."
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                outline: 'none',
                                fontSize: '0.85rem',
                                color: '#1F2937',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Phạm vi áp dụng
                            </label>
                            <select
                              value={activeInst.scope || 'Tất cả'}
                              onChange={(e) => handleUpdateWorkInstructionScope(activeInst.id, e.target.value)}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                outline: 'none',
                                fontSize: '0.85rem',
                                backgroundColor: 'white',
                                color: '#1F2937',
                                boxSizing: 'border-box',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Tất cả">Tất cả</option>
                              {systemScreens
                                .filter(scr => scr.platform && scr.platform.toLowerCase() === 'mobile')
                                .map(scr => (
                                  <option key={scr.id} value={scr.route_path}>
                                    {scr.title || scr.route_path}
                                  </option>
                                ))
                              }
                            </select>
                          </div>
                        </div>

                        {/* Ghi chú */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ghi chú
                          </label>
                          <textarea
                            value={activeInst.note || ''}
                            onChange={(e) => handleUpdateWorkInstructionNote(activeInst.id, e.target.value)}
                            placeholder="Nhập ghi chú..."
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              outline: 'none',
                              fontSize: '0.85rem',
                              color: '#1F2937',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Bảng danh sách bước */}
                        <div style={{ marginTop: '6px', overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                                <th style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px', textAlign: 'center' }}>Bước</th>
                                <th style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Nội dung thực hiện</th>
                                <th style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Lưu ý</th>
                                <th style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Tiêu chuẩn chấp nhận</th>
                                <th style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px', textAlign: 'center' }}>Icon</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(!activeInst.steps || activeInst.steps.length === 0) ? (
                                <tr>
                                  <td colSpan="5" style={{ padding: '28px 14px', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                    Chưa có bước hướng dẫn nào. Hãy bấm "Thêm bước mới" ở dưới để bắt đầu.
                                  </td>
                                </tr>
                              ) : (
                                activeInst.steps.map((step, idx) => {
                                  const imgUrl = step.image_url || (step.image_urls && step.image_urls[0]) || '';
                                  return (
                                    <tr
                                      key={step.id || idx}
                                      style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s' }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', textAlign: 'center' }}>
                                        Bước {step.step_number}
                                      </td>
                                      <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          {imgUrl ? (
                                            <img src={imgUrl} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB' }} alt="" />
                                          ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0 }}>
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            </div>
                                          )}
                                          <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>
                                            {step.name || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Chưa nhập nội dung</span>}
                                          </span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#6B7280' }}>
                                        {step.note || <span style={{ color: '#D1D5DB' }}>---</span>}
                                      </td>
                                      <td style={{ padding: '12px 14px' }}>
                                        {step.standard ? (
                                          <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center',
                                            backgroundColor: '#FAF6F0', 
                                            color: '#7B5233', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold', 
                                            padding: '4px 10px', 
                                            borderRadius: '12px', 
                                            border: '1px solid #EADCC9' 
                                          }}>
                                            {step.standard}
                                          </span>
                                        ) : (
                                          <span style={{ color: '#D1D5DB' }}>---</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditStepPopup(activeInst, idx)}
                                          style={{ border: 'none', background: 'none', color: '#4B5563', cursor: 'pointer', padding: '6px', display: 'inline-flex', alignItems: 'center', transition: 'color 0.2s', margin: '0 auto' }}
                                          title="Sửa bước này"
                                          onMouseEnter={(e) => e.currentTarget.style.color = '#7B5233'}
                                          onMouseLeave={(e) => e.currentTarget.style.color = '#4B5563'}
                                        >
                                          <Edit size={15} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Nút thêm bước mới */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddStepPopup(activeInst)}
                          style={{
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
                            transition: 'color 0.2s',
                            alignSelf: 'flex-start'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#5C3D24'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#7B5233'}
                        >
                          <Plus size={16} /> Thêm bước mới
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Popup Thêm/Sửa bước */}
                {showStepPopup && activeInst && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000
                  }}>
                    <div style={{
                      backgroundColor: 'white', borderRadius: '12px', padding: '24px',
                      width: '90%', maxWidth: '620px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                      maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
                          {isEditingStep ? 'Cập nhật bước hướng dẫn' : 'Thêm bước hướng dẫn'}
                        </h2>
                        <button type="button" onClick={() => setShowStepPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
                      </div>
                      <form onSubmit={handleSaveStep} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                          {/* Ảnh */}
                          <div style={{ width: '200px' }}>
                            <div
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file'; input.accept = 'image/*';
                                input.onchange = (ev) => handlePopupImageUpload(ev.target.files[0]);
                                input.click();
                              }}
                              style={{
                                width: '200px', height: '200px',
                                border: '1.5px dashed #D1D5DB', borderRadius: '8px',
                                backgroundColor: '#F9FAFB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s', boxSizing: 'border-box'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                            >
                              {stepForm.image_url ? (
                                <img src={stepForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#9CA3AF' }}>
                                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tải hình ảnh lên</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Bước + Nội dung */}
                          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase' }}>Bước:</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                  value={stepForm.step_number}
                                  onChange={(e) => setStepForm(prev => ({ ...prev, step_number: parseInt(e.target.value, 10) }))}
                                  style={{ flex: 1, height: '36px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem', color: '#1F2937', backgroundColor: 'white', cursor: 'pointer' }}
                                >
                                  {Array.from({ length: isEditingStep ? (activeInst.steps || []).length : (activeInst.steps || []).length + 1 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>TL{String(i + 1).padStart(2, '0')}</option>
                                  ))}
                                </select>
                                <button type="button" onClick={() => handleReorderStepInPopup(stepForm.step_number)}
                                  style={{ height: '36px', padding: '0 14px', backgroundColor: '#4B301E', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#362114'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4B301E'}
                                >Đổi bước</button>
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase' }}>Nội dung thực hiện</label>
                              <textarea value={stepForm.name} onChange={(e) => setStepForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Nhập nội dung thực hiện..." required rows="4"
                                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem', color: '#1F2937', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase' }}>Lưu ý</label>
                          <input type="text" value={stepForm.note} onChange={(e) => setStepForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Nhập lưu ý..."
                            style={{ width: '100%', height: '36px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem', color: '#1F2937', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', textTransform: 'uppercase' }}>Tiêu chuẩn chấp nhận</label>
                          <input type="text" value={stepForm.standard} onChange={(e) => setStepForm(prev => ({ ...prev, standard: e.target.value }))} placeholder="Nhập tiêu chuẩn..."
                            style={{ width: '100%', height: '36px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '0.85rem', color: '#1F2937', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                          <button type="button" onClick={() => setShowStepPopup(false)}
                            style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #7B5233', backgroundColor: 'white', color: '#7B5233', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                          >Hủy bỏ</button>
                          <button type="submit"
                            style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#4B301E', color: 'white', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                          >{isEditingStep ? 'Cập nhật' : 'Tạo mới'}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab 3: Lịch sử kiểm tra */}
          {activeTab === 'history' && isProcessMode && (
            <div style={cardStyle}>
              <div style={{ ...headerStyle, cursor: 'default' }}>
                <span style={headerTextStyle}>Lịch sử kiểm tra & Đánh giá</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #EADCC9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày đánh giá gần nhất</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>{formData.last_checked_date || 'Chưa thực hiện đánh giá'}</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Kết quả đánh giá gần nhất</span>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: 'bold', 
                      color: formData.last_result === 'Đạt' ? '#16a34a' : (formData.last_result === 'Không đạt' ? '#dc2626' : '#475569') 
                    }}>
                      {formData.last_result || 'Chưa đánh giá'}
                    </span>
                  </div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>STT</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ngày kiểm tra</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Người đánh giá</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Kết quả</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.last_checked_date ? (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>1</td>
                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#1e293b' }}>{formData.last_checked_date}</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{formData.approver || 'Hệ thống'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 'bold',
                              backgroundColor: formData.last_result === 'Đạt' ? '#dcfce7' : '#fee2e2',
                              color: formData.last_result === 'Đạt' ? '#15803d' : '#b91c1c'
                            }}>
                              {formData.last_result}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>Đánh giá định kỳ theo quy trình ISO</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa có dữ liệu lịch sử kiểm tra được ghi nhận.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Biểu mẫu đính kèm */}
          {activeTab === 'templates' && (
            <div style={cardStyle}>
              <div style={{ ...headerStyle, cursor: 'default' }}>
                <span style={headerTextStyle}>Danh sách Biểu mẫu & Tài liệu đi kèm</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid #EADCC9' }}>
                
                {/* 4.1 Word template file download */}
                <div style={{ backgroundColor: '#FAF6F0', padding: '16px', borderRadius: '6px', border: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                      <FileText size={20} style={{ color: '#7B5233' }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#2d1a12', display: 'block' }}>
                        Tài liệu quy trình gốc (Word Template)
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Mã gốc: {formData.iso_document_code || '---'} | File đính kèm: {formData.file_path ? formData.file_path.split('/').pop() : 'Chưa có file Word đính kèm'}
                      </span>
                    </div>
                  </div>
                  {formData.file_path && (
                    <a
                      href={`${api.defaults.baseURL.replace('/api/v1', '')}/${formData.file_path}`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#7B5233',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(123, 82, 51, 0.1)'
                      }}
                    >
                      <Download size={14} /> Tải tài liệu gốc
                    </a>
                  )}
                </div>

                {/* 4.2 Step templates checklist */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '8px' }}>
                    Biểu mẫu / Tài liệu phát sinh theo các bước công việc
                  </h4>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233', width: '80px' }}>Bước số</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Tên công việc</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>Trách nhiệm</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Tên Biểu mẫu đính kèm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.steps && formData.steps.filter(s => s.template_files).length > 0 ? (
                          formData.steps.filter(s => s.template_files).map((step, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Bước {step.step_number}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '500', color: '#1e293b' }}>{step.name}</td>
                              <td style={{ padding: '10px 12px', color: '#475569' }}>{step.assignee_role || '---'}</td>
                              <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <FileText size={14} style={{ color: '#64748b' }} />
                                  <span>{step.template_files}</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                              Không có biểu mẫu đính kèm nào ở các bước trong quy trình này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}


      {/* --- PREVIEW MODAL: HIGH-FIDELITY PDF/A4 PRINT PREVIEW (G7.CL -QT01 Template Format) --- */}
      {showPdfPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#f1f5f9',
            width: '95%',
            maxWidth: '1000px',
            height: '92vh',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Toolbar Header */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#7B5233',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #623f25'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1rem', fontFamily: 'sans-serif' }}>Xem trước tài liệu in (PDF Preview)</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleDownloadDoc}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Tải file Word
                </button>
                <button 
                  onClick={handlePrintPdf}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🖨️ In tài liệu
                </button>
                <button 
                  onClick={() => setShowPdfPreview(false)}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area - Visual A4 page style */}
            <div style={{
              flex: 1,
              padding: '30px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              {/* Virtual A4 Page */}
              <div id="pdf-preview-document-root" className="print-document" style={{
                fontFamily: '"Times New Roman", Times, serif',
                color: 'black',
                lineHeight: '1.5',
                fontSize: '12pt',
                width: '210mm',
                boxSizing: 'border-box'
              }}>
                <style dangerouslySetInnerHTML={{ __html: `
                  .print-document, .print-document * {
                    font-family: "Times New Roman", Times, serif !important;
                  }
                  .a4-page {
                    background-color: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm 15mm;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    box-sizing: border-box;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                  }
                  .cover-border-box {
                    border: 2px solid black;
                    padding: 24px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-sizing: border-box;
                  }
                  table.no-border, table.no-border tr, table.no-border td {
                    border: none !important;
                  }
                  @media print {
                    .a4-page {
                      width: 100% !important;
                      min-height: unset !important;
                      height: auto !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                      page-break-after: always !important;
                    }
                    .a4-page:last-child {
                      page-break-after: avoid !important;
                    }
                    .cover-border-box {
                      height: 250mm !important;
                      box-sizing: border-box !important;
                      flex: none !important;
                    }
                  }
                ` }} />

                 {/* PAGE 1: COVER PAGE */}
                <div className="a4-page">
                   {/* Outer Border Box */}
                   <div className="cover-border-box">
                     {/* Top Header Table */}
                     <table className="header-table" style={{
                       width: '100%',
                       borderCollapse: 'collapse',
                       border: '1.5px solid black',
                       marginBottom: '20px'
                     }}>
                       <tbody>
                         <tr>
                           <td className="header-logo-cell" style={{
                             width: '30%',
                             textAlign: 'center',
                             padding: '10px',
                             verticalAlign: 'middle',
                             borderRight: '1.5px solid black'
                           }}>
                             <img src={logoCty} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                           </td>
                           <td style={{
                             width: '70%',
                             textAlign: 'center',
                             padding: '10px',
                             fontWeight: 'bold',
                             fontSize: '14pt',
                             textTransform: 'uppercase',
                             verticalAlign: 'middle',
                             letterSpacing: '0.5px'
                           }}>
                             CÔNG TY CỔ PHẦN VINA G7
                           </td>
                         </tr>
                       </tbody>
                     </table>

                     <div className="word-only-spacer" style={{ display: 'none' }}></div>

                     {/* Middle: Title & Metadata */}
                     <div style={{ textAlign: 'center', margin: '40px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <h1 style={{
                         fontSize: '18pt',
                         fontWeight: 'bold',
                         lineHeight: '1.4',
                         marginBottom: '30px',
                         textTransform: 'uppercase'
                       }}>
                         {formData.name || '---'}
                       </h1>
                       
                       <table className="dashed-table" style={{
                         width: '75%',
                         margin: '0 auto',
                         borderCollapse: 'collapse',
                         border: '1px dashed black',
                         fontSize: '11pt',
                         textAlign: 'left'
                       }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold', width: '45%' }}>Mã hiệu:</td>
                            <td style={{ border: '1px dashed black', padding: '8px', width: '55%' }}>{formData.code || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Lần ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.version || '01'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Ngày ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.issue_date || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.folder || 'QLCL'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="word-only-spacer2" style={{ display: 'none' }}></div>

                    {/* Bottom: Approval Block */}
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid black',
                      textAlign: 'center',
                      fontSize: '11pt',
                      marginTop: 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>TRÁCH NHIỆM</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '30%' }}>HỌ TÊN</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>CHỨC VỤ</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '20%' }}>KÝ TÊN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Biên soạn</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.issuer || 'ĐẶNG VĂN NAM'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.editor || 'TP. QLCL'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '50px' }}></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Phê duyệt</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.approver || 'NGUYỄN HÒA'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.owner || 'PHÓ TGĐ'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '50px' }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Cover Page Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '10px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh: 
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 1
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PAGE 2: REVISION LOGS */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* Revision logs table */}
                    <h4 style={{ margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: '12pt', fontWeight: 'bold', textAlign: 'center' }}>
                      Theo dõi sửa đổi nội dung tài liệu
                    </h4>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid black',
                      marginBottom: '20px',
                      fontSize: '11pt',
                      textAlign: 'center'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', height: '34px' }}>
                          <th style={{ border: '1px solid black', padding: '6px', width: '10%' }}>Số TT</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>Ngày Sửa</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '55%' }}>Nội Dung Sửa Đổi</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '15%' }}>Trang Số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 18 }).map((_, idx) => {
                          const log = (formData.revision_logs || [])[idx] || {};
                          return (
                            <tr key={idx} style={{ height: '32px' }}>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.rev_date || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>{log.content || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.page_no || '\u00A0'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Page 2 Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '20px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh: 
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 2
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PAGE 3+: CONTENT PAGES */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>

                    {/* Dynamic A4 Sections content renderer */}
                    {Object.keys(formData.sections || {})
                      .filter(key => !key.startsWith('__'))
                      .map((sectionKey, sIdx) => {
                        const isFlowchart = formData.section_types?.[sectionKey] === 'flowchart';
                        const html = formData.sections[sectionKey] || '';

                        if (isFlowchart) {
                          return (
                            <React.Fragment key={sectionKey}>
                              {/* 1. Flowchart Diagram & table */}
                              <div style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                <h3 style={{
                                  fontSize: '13pt',
                                  fontWeight: 'bold',
                                  margin: '0 0 10px 0',
                                  borderBottom: '1px solid black',
                                  paddingBottom: '2px'
                                }}>
                                  {sIdx + 1}. {sectionKey}
                                </h3>
                                
                                <div style={{ marginBottom: '20px' }}>
                                  <FlowchartTable steps={formData.steps || []} />
                                </div>

                                {/* Explanations section details (Times New Roman formatted) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                  {(formData.steps || []).map((step, idx) => {
                                    const stepLabel = (stepDisplayLabels[step.step_number] || '').replace(/^B/, 'Bước ') || `Bước ${step.step_number}`;
                                    return (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11.5pt', color: 'black' }}>
                                          {stepLabel}: {step.name}
                                        </div>
                                        {step.instructions ? (
                                          <div 
                                            dangerouslySetInnerHTML={{ __html: step.instructions }} 
                                            style={{ paddingLeft: '16px', color: 'black', fontSize: '11pt' }}
                                          />
                                        ) : (
                                          <div style={{ paddingLeft: '16px', color: '#777', fontStyle: 'italic', fontSize: '10.5pt' }}>
                                            (Chưa có giải thích cho bước này)
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Visual user manual (only if there are work instructions configured) */}
                              {isProcessMode && (formData.work_instructions || []).map((inst, instIdx) => (
                                <div key={inst.id || instIdx} style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                  <h3 style={{
                                    fontSize: '13pt',
                                    fontWeight: 'bold',
                                    margin: '0 0 16px 0',
                                    borderBottom: '1px solid black',
                                    paddingBottom: '2px'
                                  }}>
                                    {sIdx + 1}.{instIdx + 1}. {inst.title || `Hướng dẫn thực hiện ${instIdx + 1}`}
                                  </h3>
                                  
                                  <div className="instruction-grid" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                  }}>
                                    {(inst.steps || []).map((step, idx) => {
                                      const images = step.image_urls || [];
                                      return (
                                        <div key={idx} className="instruction-card" style={{
                                          border: '1px solid black',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '10px'
                                        }}>
                                          {/* Work description */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                              border: '1px solid black',
                                              fontSize: '9.5pt',
                                              fontWeight: 'bold',
                                              padding: '3px 10px',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              Bước {step.step_number}
                                            </span>
                                            <span style={{ fontSize: '11pt', fontWeight: 'bold' }}>{step.name || '(Chưa nhập công việc)'}</span>
                                          </div>

                                          {/* Images row/grid */}
                                          {images.length > 0 ? (
                                            <div style={{ 
                                              display: 'grid', 
                                              gridTemplateColumns: `repeat(${images.length}, 1fr)`, 
                                              gap: '10px',
                                              marginTop: '4px'
                                            }}>
                                              {images.map((imgUrl, imgIdx) => (
                                                <div 
                                                  key={imgIdx} 
                                                  style={{
                                                    height: '140px',
                                                    border: '1px solid black',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#f8fafc'
                                                  }}
                                                >
                                                  <img 
                                                    src={imgUrl} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    alt={`hinh ${imgIdx + 1}`}
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '10pt', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>
                                              (Chưa có hình ảnh minh họa cho bước này)
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(!inst.steps || inst.steps.length === 0) && (
                                      <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                                        Chưa có bước hướng dẫn nào được cấu hình trong tài liệu này.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <div key={sectionKey} style={{ marginBottom: '24px' }}>
                              <h3 style={{
                                fontSize: '13pt',
                                fontWeight: 'bold',
                                margin: '0 0 6px 0',
                                borderBottom: '1px solid black',
                                paddingBottom: '2px'
                              }}>
                                {sIdx + 1}. {sectionKey}
                              </h3>
                              {html ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: html.replace(/✔\s*/g, '- ').replace(/✓\s*/g, '- ') }} 
                                  style={{ paddingLeft: '8px', fontSize: '11.5pt' }}
                                />
                              ) : (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic', paddingLeft: '8px', fontSize: '11pt' }}>
                                  (Chưa có nội dung thiết lập cho mục này)
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                  </div>

                  {/* Page 2+ Running Footer */}
                  <table className="no-border" style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '20px',
                    fontSize: '9pt',
                    fontStyle: 'italic'
                  }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', width: '30%' }}>
                          Mã hiệu: {formData.code || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày ban hành: {formData.issue_date || '---'}
                        </td>
                        <td style={{ textAlign: 'center', width: '25%' }}>
                          Ngày hiệu chỉnh: 
                        </td>
                        <td style={{ textAlign: 'right', width: '20%' }}>
                          Lần ban hành: {formData.version || '01'} | Trang 3
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ISOProcessEditorView;
