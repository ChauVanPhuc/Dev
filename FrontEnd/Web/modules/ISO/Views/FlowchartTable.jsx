import React from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const SVG_W = 860;
const H_HDR = 40;
const H_ROW = 120;

// Column X starts + widths
const COL = {
  buoc:   { x: 0,   w: 70  },
  trach:  { x: 70,  w: 150 },
  luudo:  { x: 220, w: 450 },
  phuluc: { x: 670, w: 190 },
};

// Node positions (center X) within luudo column
const MAIN_CX  = 325;   // main flow node center X
const BR0_CX   = 470;   // 1st branch
const BR1_CX   = 580;   // 2nd branch
const RET_CX   = 645;   // return node (far right of luudo)

// Node sizes
const RECT = { w: 110, h: 44 };
const OVAL = { w: 110, h: 44 };
const DIAM = { w: 112, h: 58 };

const rowY   = (i) => H_HDR + i * H_ROW;
const nodeCY = (i) => rowY(i) + H_ROW / 2;

// ─── Text wrap helper ──────────────────────────────────────────────────────────
function wrapText(text, maxChars) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length <= maxChars) { cur = candidate; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function SvgText({ x, y, text, maxChars = 14, fontSize = 10, fontWeight = "normal", fill = "#000", anchor = "middle" }) {
  const lines = wrapText(text, maxChars);
  const lh = fontSize + 2;
  const totalH = lh * (lines.length - 1);
  return (
    <text textAnchor={anchor} fontFamily="Georgia, 'Times New Roman', serif" fontSize={fontSize} fontWeight={fontWeight} fill={fill}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} y={y - totalH / 2 + i * lh}>{l}</tspan>
      ))}
    </text>
  );
}

// ─── Node shapes ───────────────────────────────────────────────────────────────
function RectNode({ cx, cy, label, w = RECT.w, h = RECT.h, stroke = "#000" }) {
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="white" stroke={stroke} strokeWidth="1" />
      <SvgText x={cx} y={cy} text={label} maxChars={Math.floor(w / 6)} />
    </g>
  );
}

function OvalNode({ cx, cy, label, w = OVAL.w, h = OVAL.h, stroke = "#000" }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="white" stroke={stroke} strokeWidth="1" />
      <SvgText x={cx} y={cy} text={label} maxChars={Math.floor(w / 6)} />
    </g>
  );
}

function DiamondNode({ cx, cy, label, w = DIAM.w, h = DIAM.h }) {
  const pts = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return (
    <g>
      <polygon points={pts} fill="white" stroke="#000" strokeWidth="1" />
      <SvgText x={cx} y={cy} text={label} maxChars={Math.floor((w * 0.55) / 6)} />
    </g>
  );
}

// ─── Arrow helpers ─────────────────────────────────────────────────────────────
const nodeBottom = (type, cy) => cy + (type === "decision" ? DIAM.h / 2 : RECT.h / 2);
const nodeTop    = (type, cy) => cy - (type === "decision" ? DIAM.h / 2 : RECT.h / 2);
const nodeRight  = (type, cx) => cx + (type === "decision" ? DIAM.w / 2 : RECT.w / 2);

function ArrowLine({ x1, y1, x2, y2, color = "#000", marker = "url(#arrMain)", label = "", dashed = false }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="1.2"
        strokeDasharray={dashed ? "5,3" : "none"}
        markerEnd={marker} />
      {label && (
        <text x={mx + 3} y={my - 4} fontFamily="serif" fontSize="9" fontWeight="bold" fill={color}>{label}</text>
      )}
    </g>
  );
}

function PolyArrow({ points, color = "#cc0000", marker = "url(#arrRed)", label = "" }) {
  const pts = points.map(p => `${p[0]},${p[1]}`).join(" ");
  const mid = points[Math.floor(points.length / 2)];
  return (
    <g>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" markerEnd={marker} />
      {label && mid && (
        <text x={mid[0] + 3} y={mid[1] - 4} fontFamily="serif" fontSize="9" fontWeight="bold" fill={color}>{label}</text>
      )}
    </g>
  );
}

// ─── Fail path helper ──────────────────────────────────────────────────────────
function getFailPath(step) {
  if (step.fail_path && step.fail_path.length > 0) return step.fail_path;
  if (step.has_branch) {
    return [
      { name: step.fail_node_name_1 || "Xử lý không phù hợp", assignee_role: step.assignee_role, edge_label: "Không" },
      { name: step.fail_node_name_3 || "Trả hàng", assignee_role: step.assignee_role, return_to_step: null },
    ];
  }
  return [];
}

function getNodeType(step, idx, total) {
  if (idx === 0 || idx === total - 1) return "terminal";
  if (step.node_type === "decision") return "decision";
  return step.node_type || "task";
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FlowchartTable({ steps = [] }) {
  if (!steps.length) return null;
  const total = steps.length;
  const svgH = H_HDR + total * H_ROW + 10;

  const elems = [];

  // ── Table grid ──────────────────────────────────────────────────────────────
  elems.push(<rect key="bg" x={0} y={0} width={SVG_W} height={svgH} fill="white" stroke="#000" strokeWidth="1.5" />);
  elems.push(<line key="hdrLine" x1={0} y1={H_HDR} x2={SVG_W} y2={H_HDR} stroke="#000" strokeWidth="1.5" />);

  // Column dividers
  [COL.trach.x, COL.luudo.x, COL.phuluc.x].forEach((x, i) => (
    elems.push(<line key={`col${i}`} x1={x} y1={0} x2={x} y2={svgH} stroke="#000" strokeWidth="1" />)
  ));
  // Row dividers
  steps.forEach((_, i) => {
    if (i > 0) elems.push(<line key={`row${i}`} x1={0} y1={rowY(i)} x2={SVG_W} y2={rowY(i)} stroke="#000" strokeWidth="0.5" />);
  });

  // ── Headers ─────────────────────────────────────────────────────────────────
  const hdrs = [
    { x: COL.buoc.x + COL.buoc.w / 2, label: "Bước" },
    { x: COL.trach.x + COL.trach.w / 2, label: "Trách nhiệm" },
    { x: COL.luudo.x + COL.luudo.w / 2, label: "Lưu đồ" },
    { x: COL.phuluc.x + COL.phuluc.w / 2, label: "Phụ lục" },
  ];
  hdrs.forEach(h => elems.push(
    <text key={`hdr-${h.label}`} x={h.x} y={H_HDR / 2 + 5} textAnchor="middle"
      fontFamily="Georgia, serif" fontSize="12" fontWeight="bold" fill="#000" textDecoration="underline">
      {h.label}
    </text>
  ));

  // ── Pre-calculate return node positions ──────────────────────────────────────
  // key: "stepNum-branchIdx" → {cx, cy}
  const retNodePos = {};
  steps.forEach((step, idx) => {
    if (step.node_type === "decision" && step.has_branch) {
      const fp = getFailPath(step);
      fp.forEach((pn, pi) => {
        if (pn.return_to_step) {
          const ti = steps.findIndex(s => s.step_number === pn.return_to_step);
          if (ti >= 0) {
            retNodePos[`${step.step_number}-${pi}`] = { cx: RET_CX, cy: nodeCY(ti) };
          }
        }
      });
    }
  });

  // ── Render each step ─────────────────────────────────────────────────────────
  steps.forEach((step, idx) => {
    const cy   = nodeCY(idx);
    const type = getNodeType(step, idx, total);

    // Step number
    elems.push(
      <text key={`sn${idx}`} x={COL.buoc.x + COL.buoc.w / 2} y={cy + 4}
        textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill="#000">
        {idx + 1}.
      </text>
    );

    // Responsibility text
    const roleLines = wrapText(`- ${step.assignee_role || ""}`, 18);
    roleLines.forEach((line, li) => (
      elems.push(
        <text key={`role${idx}-${li}`} x={COL.trach.x + 8} y={cy - (roleLines.length - 1) * 6 + li * 12}
          fontFamily="Georgia, serif" fontSize="10" fill="#000">{line}</text>
      )
    ));

    // Appendix
    if (step.template_files) {
      step.template_files.split(",").map(f => f.trim()).filter(Boolean).forEach((f, fi) => (
        elems.push(
          <text key={`app${idx}-${fi}`} x={COL.phuluc.x + 8} y={cy - 10 + fi * 13}
            fontFamily="Georgia, serif" fontSize="9" fill="#0000cc">{f}</text>
        )
      ));
    }

    // Main flow node
    const nodeEl = type === "terminal"
      ? <OvalNode key={`nd${idx}`} cx={MAIN_CX} cy={cy} label={step.name} />
      : type === "decision"
      ? <DiamondNode key={`nd${idx}`} cx={MAIN_CX} cy={cy} label={step.name} />
      : <RectNode key={`nd${idx}`} cx={MAIN_CX} cy={cy} label={step.name} />;
    elems.push(nodeEl);

    // Vertical arrow to next main step
    if (idx < total - 1) {
      const nextType = getNodeType(steps[idx + 1], idx + 1, total);
      const y1 = nodeBottom(type, cy) + 1;
      const y2 = nodeTop(nextType, nodeCY(idx + 1)) - 1;
      elems.push(
        <g key={`varr${idx}`}>
          <line x1={MAIN_CX} y1={y1} x2={MAIN_CX} y2={y2}
            stroke="#000" strokeWidth="1.2" markerEnd="url(#arrMain)" />
          {type === "decision" && (
            <text x={MAIN_CX + 5} y={y1 + (y2 - y1) / 2}
              fontFamily="serif" fontSize="9" fontWeight="bold" fill="#cc0000">Đồng ý</text>
          )}
        </g>
      );
    }

    // Branch nodes for decision
    if (type === "decision" && step.has_branch) {
      const fp = getFailPath(step);
      const branchXPositions = [BR0_CX, BR1_CX];

      fp.forEach((pn, pi) => {
        const retKey = `${step.step_number}-${pi}`;
        const isReturn = !!pn.return_to_step && retNodePos[retKey];
        const bcx = isReturn ? retNodePos[retKey].cx : (branchXPositions[pi] || BR1_CX + (pi - 1) * 100);
        const bcy = isReturn ? retNodePos[retKey].cy : cy;
        const edgeLabel = pn.edge_label || (pi === 0 ? "Không" : "");

        // Draw branch node
        if (isReturn) {
          elems.push(<OvalNode key={`br${idx}-${pi}`} cx={bcx} cy={bcy} w={100} h={40} label={pn.name} stroke="#cc0000" />);
        } else {
          elems.push(<RectNode key={`br${idx}-${pi}`} cx={bcx} cy={bcy} w={100} h={40} label={pn.name} stroke="#cc0000" />);
        }

        // Arrow
        if (pi === 0) {
          // Decision → first branch (horizontal)
          const x1 = nodeRight("decision", MAIN_CX) + 1;
          const x2 = bcx - 50 - 1;
          elems.push(
            <g key={`barr${idx}-${pi}`}>
              <line x1={x1} y1={cy} x2={x2} y2={cy}
                stroke="#cc0000" strokeWidth="1.2" markerEnd="url(#arrRed)" />
              {edgeLabel && (
                <text x={x1 + (x2 - x1) / 2} y={cy - 4}
                  textAnchor="middle" fontFamily="serif" fontSize="9" fontWeight="bold" fill="#cc0000">
                  {edgeLabel}
                </text>
              )}
            </g>
          );
        } else if (!isReturn) {
          // Previous branch → this branch (horizontal)
          const prevCX = branchXPositions[pi - 1] || BR0_CX;
          const x1 = prevCX + 50 + 1;
          const x2 = bcx - 50 - 1;
          elems.push(
            <line key={`barr${idx}-${pi}`} x1={x1} y1={cy} x2={x2} y2={cy}
              stroke="#cc0000" strokeWidth="1.2" markerEnd="url(#arrRed)" />
          );
        } else {
          // Return arrow: prev branch → right bus → up → return node left side
          const prevCX = pi > 0 ? (branchXPositions[pi - 1] || BR0_CX) : MAIN_CX;
          const prevBRight = prevCX + 50;
          const busX = COL.phuluc.x - 15; // right bus line
          const retLeft = bcx - 50;

          // Direction: up or down?
          const goUp = bcy < cy;
          const busEntry = goUp ? Math.min(cy, bcy) - 10 : Math.max(cy, bcy) + 10;

          const pts = [
            [prevBRight, cy],
            [busX, cy],
            [busX, bcy],
            [retLeft, bcy],
          ];
          elems.push(
            <PolyArrow key={`rarr${idx}-${pi}`} points={pts} color="#cc0000" marker="url(#arrRed)" />
          );
        }
      });
    }
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${SVG_W} ${svgH}`}
        style={{ width: "100%", height: "auto", display: "block", backgroundColor: "white", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <defs>
          <marker id="arrMain" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#000" />
          </marker>
          <marker id="arrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#cc0000" />
          </marker>
        </defs>
        {elems}
      </svg>
    </div>
  );
}
