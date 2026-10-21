import React from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SVG_W = 620;
const H_HDR = 36;
const H_ROW = 120;

// Column X starts + widths
const COL = {
  buoc:   { x: 0,   w: 38  },
  trach:  { x: 38,  w: 150 },
  luudo:  { x: 188, w: 252 },
  phuluc: { x: 440, w: 180 },
};

// Node center X in luudo column (căn giữa hoàn hảo dưới chữ Lưu đồ)
const MAIN_CX = 188 + 118; // 306

// Node sizes matching Canvas
const RECT = { w: 160, h: 44 };
const OVAL = { w: 160, h: 40 };
const DIAM = { w: 98,  h: 60 };

const rowY   = (i) => H_HDR + i * H_ROW;
const nodeCY = (i) => rowY(i) + H_ROW / 2;

// ─── XML Escape Helper ─────────────────────────────────────────────────────────
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Text wrap helper ──────────────────────────────────────────────────────────
function wrapText(text, maxChars) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function renderWrappedText(x, y, text, maxChars = 20, fontSize = 9.5, fontWeight = "bold", fill = "#000000", anchor = "middle", yOffset = 0) {
  const lines = wrapText(text, maxChars);
  const lh = fontSize + 3.5;
  const totalH = lh * (lines.length - 1);
  const tspans = lines.map((l, i) => `<tspan x="${x}" y="${y + yOffset - totalH / 2 + i * lh + fontSize * 0.35}">${escapeXml(l)}</tspan>`).join("");
  return `<text text-anchor="${anchor}" font-family="'Times New Roman', Times, serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${tspans}</text>`;
}

// ─── Node shapes matching Flowchart Canvas ─────────────────────────────────────
function renderRectNode({ cx, cy, label, w = RECT.w, h = RECT.h }) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const fontSize = h < 44 ? 9 : 9.5;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ry="4" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
      ${renderWrappedText(cx, cy, label, 20, fontSize, "bold", "#000000", "middle", 0)}
    </g>
  `;
}

function renderOvalNode({ cx, cy, label, w = OVAL.w, h = OVAL.h }) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const rx = h / 2;
  const fontSize = h < 42 ? 9 : 9.5;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
      ${renderWrappedText(cx, cy, label, 20, fontSize, "bold", "#000000", "middle", 0)}
    </g>
  `;
}

function renderDiamondNode({ cx, cy, label, w = DIAM.w, h = DIAM.h }) {
  const pts = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  const lines = wrapText(label, 15);
  // Với chữ 3 dòng trong hình thoi, dùng font 8.2 và khoảng cách dòng 10.7 để text nằm gọn bên trong biên dạng
  const fontSize = lines.length >= 3 ? (h < 60 ? 8.2 : 8.8) : (h < 60 ? 9 : 9.5);
  const lh = fontSize + 2.5;
  const totalH = lh * (lines.length - 1);
  const tspans = lines.map((l, i) => `<tspan x="${cx}" y="${cy - totalH / 2 + i * lh + fontSize * 0.35}">${escapeXml(l)}</tspan>`).join("");
  return `
    <g>
      <polygon points="${pts}" fill="#ffffff" stroke="#000000" stroke-width="1.5" />
      <text text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="${fontSize}" font-weight="bold" fill="#000000">${tspans}</text>
    </g>
  `;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function getFlowchartRowHeight(totalSteps) {
  if (totalSteps <= 4) return 115;
  if (totalSteps === 5) return 108;
  if (totalSteps === 6) return 100;
  if (totalSteps === 7) return 92;
  if (totalSteps === 8) return 84;
  if (totalSteps === 9) return 76;
  return Math.max(68, Math.floor(700 / totalSteps));
}

const nodeBottom = (type, cy, diamH = DIAM.h, ovalH = OVAL.h, rectH = RECT.h) => cy + (type === "decision" ? diamH / 2 : (type === "terminal" ? ovalH / 2 : rectH / 2));
const nodeTop    = (type, cy, diamH = DIAM.h, ovalH = OVAL.h, rectH = RECT.h) => cy - (type === "decision" ? diamH / 2 : (type === "terminal" ? ovalH / 2 : rectH / 2));
const nodeRight  = (type, cx, diamW = DIAM.w) => cx + (type === "decision" ? diamW / 2 : (type === "terminal" ? OVAL.w / 2 : RECT.w / 2));

function getNodeType(step, idx, total) {
  const raw = (step.node_type || "").toLowerCase();
  if (raw === "decision" || (step.fail_path && step.fail_path.length > 0)) return "decision";
  if (raw === "terminal" || raw === "start" || raw === "end") return "terminal";
  const name = (step.name || "").toLowerCase();
  if (idx === 0 || /bắt đầu|tiếp nhận/i.test(name)) return "terminal";
  if (idx === total - 1 && /kết thúc|lưu trữ|hoàn tất/i.test(name)) return "terminal";
  if (/phê duyệt|quyết định|kiểm tra|thẩm định|đối chiếu/i.test(name)) return "decision";
  return "task";
}

// ─── SVG Generator Function ────────────────────────────────────────────────────
export function generateFlowchartSvgHtml(steps = []) {
  if (!steps || !steps.length) return "";
  const total = steps.length;
  const rowH = getFlowchartRowHeight(total);
  const svgH = H_HDR + total * rowH + 10;

  const curRowY = (i) => H_HDR + i * rowH;
  const curCY = (i) => curRowY(i) + rowH / 2;

  const curDiamH = rowH < 100 ? 58 : (rowH < 105 ? 62 : DIAM.h);
  const curDiamW = rowH < 100 ? 108 : (rowH < 105 ? 112 : DIAM.w);
  const curRectH = rowH < 100 ? 42 : (rowH < 105 ? 46 : RECT.h);
  const curOvalH = rowH < 100 ? 38 : (rowH < 105 ? 42 : OVAL.h);

  const elems = [];

  // Table grid
  elems.push(`<rect x="0" y="0" width="${SVG_W}" height="${svgH}" fill="#ffffff" stroke="#000000" stroke-width="1.5" />`);
  elems.push(`<line x1="0" y1="${H_HDR}" x2="${SVG_W}" y2="${H_HDR}" stroke="#000000" stroke-width="1.5" />`);

  // Column dividers
  [COL.trach.x, COL.luudo.x, COL.phuluc.x].forEach((x) => {
    elems.push(`<line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="#000000" stroke-width="1" />`);
  });

  // Row dividers
  steps.forEach((_, i) => {
    if (i > 0) elems.push(`<line x1="0" y1="${curRowY(i)}" x2="${SVG_W}" y2="${curRowY(i)}" stroke="#000000" stroke-width="0.8" />`);
  });

  // Column Headers
  const hdrs = [
    { x: COL.buoc.x + COL.buoc.w / 2, label: "Bước" },
    { x: COL.trach.x + COL.trach.w / 2, label: "Trách nhiệm" },
    { x: COL.luudo.x + COL.luudo.w / 2, label: "Lưu đồ" },
    { x: COL.phuluc.x + COL.phuluc.w / 2, label: "Phụ lục" },
  ];
  hdrs.forEach((h) => {
    elems.push(`
      <text x="${h.x}" y="${H_HDR / 2 + 4}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="10.5" font-weight="bold" fill="#000000">
        ${escapeXml(h.label)}
      </text>
    `);
  });

  // Render each step
  steps.forEach((step, idx) => {
    const cy = curCY(idx);
    const type = getNodeType(step, idx, total);
    const stepNumber = step.step_number || (idx + 1);

    // 1. Cột Bước
    elems.push(`
      <text x="${COL.buoc.x + COL.buoc.w / 2}" y="${cy + 4}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="11" font-weight="bold" fill="#000000">
        ${stepNumber}.
      </text>
    `);

    // 2. Cột Trách nhiệm
    const rawRole = step.assignee_role || step.role || step.department || step.dept || "";
    const roleText = rawRole ? (rawRole.trim().startsWith("-") ? rawRole.trim() : `- ${rawRole.trim()}`) : "- Đang cập nhật";
    const roleLines = wrapText(roleText, 22);
    const roleSvgLines = roleLines.map((line, li) => `
      <text x="${COL.trach.x + 10}" y="${cy - (roleLines.length - 1) * 7 + li * 14}" font-family="'Times New Roman', Times, serif" font-size="10" fill="#1E293B">
        ${escapeXml(line)}
      </text>
    `).join("");
    elems.push(roleSvgLines);

    // 3. Cột Phụ lục (Biểu mẫu / Hồ sơ)
    const rawTplStr = step.template_files || step.template_file || step.forms || step.form_name || step.template || "";
    if (rawTplStr && rawTplStr !== "---") {
      const rawTpls = rawTplStr
        .split(/[,;\n]+/)
        .map((f) => f.trim())
        .filter(Boolean);

      const allTplLines = [];
      rawTpls.forEach((f) => {
        const lines = wrapText(f, 24);
        allTplLines.push(...lines);
      });

      const totTplH = allTplLines.length * 14;
      const tplSvg = allTplLines.map((line, li) => `
        <text x="${COL.phuluc.x + 10}" y="${cy - totTplH / 2 + li * 14 + 10}" font-family="'Times New Roman', Times, serif" font-size="10" font-weight="bold" fill="#0369A1">
          ${escapeXml(line)}
        </text>
      `).join("");
      elems.push(tplSvg);
    }

    // 4. Khối lưu đồ (Node)
    const nodeStr = type === "terminal"
      ? renderOvalNode({ cx: MAIN_CX, cy, label: step.name || `Bước ${stepNumber}`, h: curOvalH })
      : type === "decision"
      ? renderDiamondNode({ cx: MAIN_CX, cy, label: step.name || `Bước ${stepNumber}`, w: curDiamW, h: curDiamH })
      : renderRectNode({ cx: MAIN_CX, cy, label: step.name || `Bước ${stepNumber}`, h: curRectH });
    elems.push(nodeStr);

    // 5. Mũi tên đi xuống bước kế tiếp (Thuận chiều / Đạt)
    if (idx < total - 1) {
      const nextStep = steps[idx + 1];
      const nextType = getNodeType(nextStep, idx + 1, total);
      const y1 = nodeBottom(type, cy, curDiamH, curOvalH, curRectH);
      const y2 = nodeTop(nextType, curCY(idx + 1), curDiamH, curOvalH, curRectH);
      const midY = (y1 + y2) / 2;

      if (type === "decision") {
        const passLabel = /phê duyệt|quyết định/i.test(step.name || "") ? "Đồng ý" : "Đạt";
        elems.push(`
          <g>
            <line x1="${MAIN_CX}" y1="${y1}" x2="${MAIN_CX}" y2="${midY - 9}" stroke="#15803D" stroke-width="1.4" />
            <rect x="${MAIN_CX - 18}" y="${midY - 9}" width="36" height="18" rx="3" fill="#DCFCE7" stroke="#15803D" stroke-width="1.2" />
            <text x="${MAIN_CX}" y="${midY + 4}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="9" font-weight="bold" fill="#15803D">
              ${escapeXml(passLabel)}
            </text>
            <line x1="${MAIN_CX}" y1="${midY + 9}" x2="${MAIN_CX}" y2="${y2}" stroke="#15803D" stroke-width="1.4" marker-end="url(#arrGreen)" />
          </g>
        `);
      } else {
        elems.push(`
          <g>
            <line x1="${MAIN_CX}" y1="${y1}" x2="${MAIN_CX}" y2="${y2}" stroke="#000000" stroke-width="1.3" marker-end="url(#arrMain)" />
          </g>
        `);
      }
    }

    // 6. Nhánh rẽ / Quay lại của Khối Quyết định (Không Đạt / Loop-back)
    if (type === "decision") {
      const fp = (step.fail_path && step.fail_path.length > 0) ? step.fail_path : [
        { return_to_step: Math.max(1, stepNumber - 1), edge_label: /phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt" }
      ];

      fp.forEach((pn, pi) => {
        if (!pn.return_to_step) return;
        const targetIdx = steps.findIndex((s) => s.step_number === pn.return_to_step);
        if (targetIdx < 0) return;

        const targetStep = steps[targetIdx];
        const targetType = getNodeType(targetStep, targetIdx, total);
        const targetCy = curCY(targetIdx);

        const xStart = nodeRight("decision", MAIN_CX, curDiamW);
        const yStart = cy;
        const busX = MAIN_CX + 96 + pi * 16; // Bus line nằm gọn gàng bên phải khối trong cột lưu đồ (trước vạch ngăn cột)
        const xEnd = nodeRight(targetType, MAIN_CX, curDiamW);
        const yEnd = targetCy;
        const midY = (yStart + yEnd) / 2;
        const failLabel = pn.edge_label || (/phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt");

        // Vẽ đường gấp khúc: Từ góc phải Decision -> Sang busX -> Lên/Xuống targetCy -> Chạm mép phải của node đích
        const pts = [
          [xStart, yStart],
          [busX, yStart],
          [busX, yEnd],
          [xEnd + 7, yEnd],
        ].map((p) => `${p[0]},${p[1]}`).join(" ");

        const badgeW = Math.max(52, failLabel.length * 6.5 + 14);

        elems.push(`
          <g>
            <!-- Đường dây rẽ nhánh đỏ -->
            <polyline points="${pts}" fill="none" stroke="#DC2626" stroke-width="1.4" />
            <!-- Mũi tên đỏ chỉ sang trái chạm đúng mép ngoài của Node đích -->
            <polygon points="${xEnd},${yEnd} ${xEnd + 8},${yEnd - 4.5} ${xEnd + 8},${yEnd + 4.5}" fill="#DC2626" />
            <!-- Nền badge đặc chống che/cắt chữ từ đường kẻ dọc -->
            <rect x="${busX - badgeW / 2}" y="${midY - 9}" width="${badgeW}" height="18" rx="3" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.2" />
            <rect x="${busX - badgeW / 2}" y="${midY - 9}" width="${badgeW}" height="18" rx="3" fill="#FEE2E2" fill-opacity="0.85" />
            <text x="${busX}" y="${midY + 4}" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="8.5" font-weight="bold" fill="#DC2626">
              ${escapeXml(failLabel)}
            </text>
          </g>
        `);
      });
    }
  });

  return `
    <svg viewBox="0 0 ${SVG_W} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="max-width: 620px; width: 100%; height: auto; display: block; margin: 0 auto; background-color: #ffffff; font-family: 'Times New Roman', Times, serif;">
      <defs>
        <marker id="arrMain" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
        </marker>
        <marker id="arrGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#15803D" />
        </marker>
        <marker id="arrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
        </marker>
      </defs>
      ${elems.join("")}
    </svg>
  `;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FlowchartTable({ steps = [], className = "", style = {} }) {
  if (!steps || !steps.length) return null;
  const svgHtml = generateFlowchartSvgHtml(steps);
  return (
    <div
      className={className}
      style={{ overflowX: "auto", ...style }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
