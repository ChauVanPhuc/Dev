import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import ChatChartRenderer from './ChatChartRenderer';

/**
 * XSS-Safe Markdown & Chart Renderer (không dùng dangerouslySetInnerHTML).
 * Hỗ trợ:
 * - Bảng Markdown GFM chuẩn (CẢ dạng có `|` đầu dòng lẫn không có `|` đầu dòng!)
 * - Tự căn phải cột số/tiền/%, làm đậm dòng Tổng cộng, nút Xuất Excel (.xlsx) & Xuất CSV
 * - Headings, danh sách chấm đầu dòng, danh sách đánh số (1. 2. 3.), blockquote, bold, inline code
 * - Fallback parse `<chart>` nếu còn sót trong văn bản lịch sử cũ
 */
const renderInlineFormatting = (line, keyPrefix) => {
  const tokens = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIdx = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(line.slice(lastIdx, match.index));
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push(<strong key={`${keyPrefix}-b-${idx++}`}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push(
        <code
          key={`${keyPrefix}-c-${idx++}`}
          style={{
            background: 'rgba(123, 82, 51, 0.1)',
            color: '#5D3A1A',
            padding: '1px 5px',
            borderRadius: '4px',
            fontSize: '0.84em',
            fontFamily: 'monospace',
          }}
        >
          {raw.slice(1, -1)}
        </code>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < line.length) {
    tokens.push(line.slice(lastIdx));
  }
  return tokens.length > 0 ? tokens : line;
};

const exportTableToCsv = (headers, rows) => {
  const escapeCell = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const csvLines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartflow_ai_table_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportTableToExcel = (headers, rows) => {
  const cleanCell = (c) => String(c ?? '').replace(/\*\*/g, '').trim();
  const sheetData = [headers.map(cleanCell), ...rows.map((r) => headers.map((_, idx) => cleanCell(r[idx] || '')))];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SmartFlow_AI');
  XLSX.writeFile(wb, `smartflow_ai_report_${Date.now()}.xlsx`);
};

const isTableSeparatorLine = (line) => {
  const trimmed = (line || '').trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed);
};

const isTableRowLine = (line) => {
  const trimmed = (line || '').trim();
  return trimmed.includes('|') && trimmed.split('|').filter((p) => p.trim() !== '').length >= 2;
};

const parsePipeRow = (r) =>
  r
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isNumericCell = (val) => {
  const clean = String(val ?? '').replace(/\*\*/g, '').trim();
  return /^[-+$€₫]?\s?\d[\d.,]*\s?(%|USD|VNĐ|VND|cái|lỗi|phiếu)?$/i.test(clean);
};

const parseMarkdownBlocks = (text, blockKeyPrefix) => {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. GFM Markdown Table (hỗ trợ cả có và không có `|` đầu dòng)
    if (i + 1 < lines.length && isTableRowLine(line) && isTableSeparatorLine(lines[i + 1])) {
      const headers = parsePipeRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRowLine(lines[i])) {
        rows.push(parsePipeRow(lines[i]));
        i += 1;
      }

      elements.push(
        <div key={`${blockKeyPrefix}-tbl-${i}`} className="chatbot-md-table-wrap">
          <div className="chatbot-md-table-toolbar">
            <span style={{ fontSize: '0.72rem', color: '#7B5233', fontWeight: 600 }}>
              {rows.length} dòng dữ liệu
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="chatbot-table-export-btn"
                onClick={() => exportTableToExcel(headers, rows)}
                title="Tải bảng dữ liệu dạng Excel (.xlsx)"
              >
                <FileSpreadsheet size={12} /> Xuất Excel
              </button>
              <button
                type="button"
                className="chatbot-table-export-btn"
                onClick={() => exportTableToCsv(headers, rows)}
                title="Tải bảng dữ liệu dạng CSV"
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="chatbot-md-table">
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{renderInlineFormatting(h, `th-${i}-${hIdx}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => {
                  const firstCell = String(row[0] || '').toLowerCase();
                  const isTotalRow = firstCell.includes('tổng') || firstCell.includes('total');
                  return (
                    <tr key={rIdx} className={isTotalRow ? 'is-total-row' : ''}>
                      {headers.map((_, cIdx) => {
                        const cellVal = row[cIdx] || '';
                        const alignRight = cIdx > 0 && isNumericCell(cellVal);
                        return (
                          <td key={cIdx} style={{ textAlign: alignRight ? 'right' : 'left' }}>
                            {renderInlineFormatting(cellVal, `td-${i}-${rIdx}-${cIdx}`)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
      continue;
    }

    // 2. Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      elements.push(
        <blockquote key={`${blockKeyPrefix}-q-${i}`} className="chatbot-md-quote">
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInlineFormatting(ql, `q-${i}-${qIdx}`)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // 3. Heading
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      elements.push(
        <div key={`${blockKeyPrefix}-h-${i}`} className="chatbot-md-heading">
          {renderInlineFormatting(hMatch[2], `h-${i}`)}
        </div>
      );
      i += 1;
      continue;
    }

    // 4. Bullet list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i += 1;
      }
      elements.push(
        <ul key={`${blockKeyPrefix}-ul-${i}`} style={{ margin: '4px 0', paddingLeft: '18px' }}>
          {items.map((it, itIdx) => (
            <li key={itIdx} style={{ marginBottom: '3px' }}>
              {renderInlineFormatting(it, `li-${i}-${itIdx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Ordered list (1. ..., 2. ...)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      elements.push(
        <ol key={`${blockKeyPrefix}-ol-${i}`} style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {items.map((it, itIdx) => (
            <li key={itIdx} style={{ marginBottom: '3px' }}>
              {renderInlineFormatting(it, `oli-${i}-${itIdx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Empty line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 7. Paragraph
    elements.push(
      <p key={`${blockKeyPrefix}-p-${i}`} style={{ margin: '3px 0', lineHeight: 1.52 }}>
        {renderInlineFormatting(line, `p-${i}`)}
      </p>
    );
    i += 1;
  }

  return elements;
};

const ChatMessageRenderer = ({ text }) => {
  if (!text) return null;

  const chartRegex = /<chart\s+type="([^"]+)"\s+title="([^"]+)"\s*>([\s\S]*?)<\/chart>/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    let parsedData = [];
    try {
      parsedData = JSON.parse(match[3].trim());
    } catch (e) {
      console.error('[ChatMessageRenderer] Invalid inline chart JSON:', e);
    }
    segments.push({
      type: 'chart',
      chartType: match[1],
      chartTitle: match[2],
      data: parsedData,
    });
    lastIndex = chartRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  return (
    <div className="chatbot-rendered-content">
      {segments.map((seg, idx) =>
        seg.type === 'chart' ? (
          <ChatChartRenderer key={`chart-${idx}`} type={seg.chartType} title={seg.chartTitle} data={seg.data} />
        ) : (
          <React.Fragment key={`txt-${idx}`}>{parseMarkdownBlocks(seg.content, `seg-${idx}`)}</React.Fragment>
        )
      )}
    </div>
  );
};

export default ChatMessageRenderer;
