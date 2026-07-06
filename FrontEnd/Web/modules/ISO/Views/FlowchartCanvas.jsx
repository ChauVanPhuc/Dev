import React, { useCallback, useMemo, useEffect, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Handle, Position, MarkerType,
  useReactFlow, ReactFlowProvider, Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Role formatter ────────────────────────────────────────────────────────────
const formatRole = (role) => {
  if (!role) return "";
  const u = role.toUpperCase().replace("BO PHAN", "").replace("BỘ PHẬN", "").trim();
  if (u.includes("QC") || u.includes("QLCL")) return "QC";
  if (u.includes("KHO")) return "Kho";
  if (u.includes("SAN XUAT") || u.includes("SẢN XUẤT") || u === "SX") return "SX";
  if (u.includes("THU MUA") || u.includes("MUA")) return "Mua";
  if (u.includes("BAN HANG") || u.includes("BÁN HÀNG") || u === "KD") return "KD";
  if (u.includes("ADMIN") || u.includes("GIAM DOC") || u.includes("GIÁM ĐỐC")) return "BGĐ";
  return role;
};

// ─── Custom Nodes ──────────────────────────────────────────────────────────────
const nodeBase = (selected) => ({
  boxShadow: selected
    ? "0 0 0 3px rgba(123,82,51,0.5), 0 4px 12px rgba(0,0,0,0.12)"
    : "0 2px 6px rgba(0,0,0,0.08)",
  transition: "box-shadow 0.2s ease",
  cursor: "grab",
});

const NodeMeta = ({ stepNumber, roleLabel }) => (
  <div style={{ fontSize: "8.5px", color: "#7B5233", marginBottom: "3px", fontWeight: "600", opacity: 0.85 }}>
    {stepNumber ? `B${stepNumber}` : ""}{stepNumber && roleLabel ? " · " : ""}{roleLabel}
  </div>
);

const TaskNode = ({ data, selected }) => (
  <div style={{ padding: "8px 12px", border: `2px solid ${selected ? "#7B5233" : data.borderColor || "#334155"}`, borderRadius: "6px", backgroundColor: "white", minWidth: "130px", maxWidth: "170px", fontSize: "11px", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "center", ...nodeBase(selected) }}>
    <Handle type="target" position={Position.Top} style={{ background: "#94a3b8", width: 8, height: 8 }} />
    <NodeMeta stepNumber={data.stepNumber} roleLabel={data.roleLabel} />
    <div style={{ lineHeight: "1.3" }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8 }} />
    <Handle type="source" position={Position.Right} id="right" style={{ background: "#e67e22", width: 8, height: 8 }} />
  </div>
);

const DiamondNode = ({ data, selected }) => (
  <div style={{ position: "relative", width: "160px", height: "80px", ...nodeBase(selected) }}>
    <Handle type="target" position={Position.Top} style={{ background: "#94a3b8", top: "0px", width: 8, height: 8 }} />
    <svg width="160" height="80" style={{ position: "absolute", top: 0, left: 0 }}>
      <polygon points="80,4 156,40 80,76 4,40" fill="white" stroke={selected ? "#7B5233" : data.borderColor || "#e67e22"} strokeWidth={selected ? "2.5" : "2"} />
    </svg>
    <div style={{ position: "absolute", top: 0, left: 0, width: "160px", height: "80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: "10px", fontWeight: "bold", textAlign: "center", padding: "0 24px", pointerEvents: "none" }}>
      <NodeMeta stepNumber={data.stepNumber} roleLabel={data.roleLabel} />
      <div style={{ lineHeight: "1.2" }}>{data.label}</div>
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", bottom: "0px", width: 8, height: 8 }} />
    <Handle type="source" position={Position.Right} id="right" style={{ background: "#e67e22", right: "0px", top: "40px", width: 8, height: 8 }} />
  </div>
);

const OvalNode = ({ data, selected }) => (
  <div style={{ padding: "8px 16px", border: `2px solid ${selected ? "#7B5233" : data.borderColor || "#1a6b3c"}`, borderRadius: "40px", backgroundColor: "white", minWidth: "130px", maxWidth: "170px", fontSize: "11px", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "center", ...nodeBase(selected) }}>
    <Handle type="target" position={Position.Top} style={{ background: "#94a3b8", width: 8, height: 8 }} />
    <NodeMeta stepNumber={data.stepNumber} roleLabel={data.roleLabel} />
    <div style={{ lineHeight: "1.3" }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8 }} />
    <Handle type="source" position={Position.Right} id="right" style={{ background: "#e67e22", width: 8, height: 8 }} />
  </div>
);

const BranchOvalNode = ({ data, selected }) => (
  <div style={{ padding: "6px 14px", border: `1.5px solid ${selected ? "#7B5233" : "#e67e22"}`, borderRadius: "40px", backgroundColor: "#fff9f0", minWidth: "100px", maxWidth: "150px", fontSize: "10px", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "center", ...nodeBase(selected) }}>
    <Handle type="target" position={Position.Left} style={{ background: "#e67e22", width: 8, height: 8 }} />
    <div style={{ fontSize: "8px", color: "#e67e22", marginBottom: "1px", fontWeight: "600" }}>{data.roleLabel}</div>
    <div>{data.label}</div>
  </div>
);

const BranchRectNode = ({ data, selected }) => (
  <div style={{ padding: "6px 12px", border: `1.5px solid ${selected ? "#7B5233" : "#e67e22"}`, borderRadius: "4px", backgroundColor: "#fff9f0", minWidth: "100px", maxWidth: "150px", fontSize: "10px", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "center", ...nodeBase(selected) }}>
    <Handle type="target" position={Position.Left} style={{ background: "#e67e22", width: 8, height: 8 }} />
    <Handle type="source" position={Position.Right} style={{ background: "#e67e22", width: 8, height: 8 }} />
    <div style={{ fontSize: "8px", color: "#e67e22", marginBottom: "1px", fontWeight: "600" }}>{data.roleLabel}</div>
    <div>{data.label}</div>
  </div>
);

const nodeTypes = { task: TaskNode, decision: DiamondNode, terminal: OvalNode, branchOval: BranchOvalNode, branchRect: BranchRectNode };

// ─── Shape Palette ─────────────────────────────────────────────────────────────
const PALETTE = [
  { type: "task", label: "Công việc", color: "#334155",
    icon: <div style={{ width: 52, height: 28, border: "2px solid #334155", borderRadius: 4, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold", color: "#334155" }}>Rect</div> },
  { type: "decision", label: "Quyết định", color: "#e67e22",
    icon: <svg width={56} height={32}><polygon points="28,2 54,16 28,30 2,16" fill="white" stroke="#e67e22" strokeWidth="2" /><text x="28" y="20" textAnchor="middle" fontSize="7" fill="#e67e22" fontWeight="bold">KT</text></svg> },
  { type: "terminal", label: "Oval", color: "#1a6b3c",
    icon: <div style={{ width: 60, height: 28, border: "2px solid #1a6b3c", borderRadius: 20, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold", color: "#1a6b3c" }}>Oval</div> },
];

const ShapePalette = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ width: "90px", flexShrink: 0, backgroundColor: "#FAF6F0", borderRight: "1px solid #EADCC9", padding: "12px 6px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
      <div style={{ fontSize: "8px", fontWeight: "700", color: "#7B5233", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center" }}>Hình khối</div>
      {PALETTE.map((item) => (
        <div key={item.type} draggable onDragStart={(e) => { e.dataTransfer.setData("application/reactflow-nodetype", item.type); e.dataTransfer.effectAllowed = "move"; }} title={`Kéo để thêm: ${item.label}`}
          onMouseEnter={() => setHovered(item.type)} onMouseLeave={() => setHovered(null)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "grab", padding: "8px 4px", borderRadius: "8px", backgroundColor: hovered === item.type ? "#EDE0D5" : "transparent", transition: "background 0.15s", width: "100%", userSelect: "none" }}>
          {item.icon}
          <span style={{ fontSize: "8px", color: "#64748b", textAlign: "center", lineHeight: "1.2", marginTop: "2px" }}>{item.label}</span>
        </div>
      ))}
      <div style={{ width: "100%", borderTop: "1px solid #EADCC9", paddingTop: "8px", marginTop: "4px" }}>
        <div style={{ fontSize: "7.5px", color: "#94a3b8", textAlign: "center", lineHeight: "1.4" }}>Kéo thả vào canvas</div>
      </div>
    </div>
  );
};

// ─── Properties Panel ──────────────────────────────────────────────────────────
const ROLES = [
  { value: "Kho", label: "Bộ phận Kho" },
  { value: "QC", label: "Bộ phận QC / QLCL" },
  { value: "Sản xuất", label: "Bộ phận Sản xuất" },
  { value: "Thu mua", label: "Bộ phận Thu mua" },
  { value: "Bán hàng", label: "Bộ phận Bán hàng" },
  { value: "Admin", label: "Ban Giám Đốc" },
];

const fieldStyle = { width: "100%", padding: "6px 8px", border: "1px solid #EADCC9", borderRadius: "6px", fontSize: "12px", backgroundColor: "white", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: "10px", fontWeight: "700", color: "#7B5233", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" };
const sectionStyle = { borderBottom: "1px solid #f1f5f9", paddingBottom: "14px", marginBottom: "14px" };

const getFailPath = (step) => {
  if (!step) return [];
  if (step.fail_path && step.fail_path.length > 0) return step.fail_path;
  if (step.has_branch) {
    const r = step.assignee_role || "QC";
    return [
      { name: step.fail_node_name_1 || "Xử lý không phù hợp", assignee_role: r },
      { name: step.fail_node_name_3 || "Trả hàng nhà cung cấp", assignee_role: r },
    ];
  }
  return [];
};

const PropertiesPanel = ({ step, stepIndex, onUpdate, onDelete, onClose }) => {
  if (!step) return null;
  const failPath = getFailPath(step);

  const updateFailPath = (newPath) => onUpdate(stepIndex, "fail_path", newPath);

  return (
    <div style={{ width: "286px", flexShrink: 0, backgroundColor: "white", borderLeft: "1px solid #EADCC9", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#7B5233", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>Bước {step.step_number} · Thuộc tính</div>
          <input value={step.name || ""} onChange={(e) => onUpdate(stepIndex, "name", e.target.value)}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", padding: "5px 8px", color: "white", fontWeight: "700", fontSize: "13px", width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "2px", flexShrink: 0, marginLeft: "8px" }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px", flex: 1 }}>
        <div style={sectionStyle}>
          <label style={labelStyle}>Bộ phận chịu trách nhiệm</label>
          <select value={step.assignee_role || ""} onChange={(e) => onUpdate(stepIndex, "assignee_role", e.target.value)} style={fieldStyle}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Loại hình khối</label>
          <select value={step.node_type || "task"} onChange={(e) => onUpdate(stepIndex, "node_type", e.target.value)} style={fieldStyle}>
            <option value="task">▭ Hình chữ nhật (Công việc)</option>
            <option value="decision">◇ Hình thoi (Kiểm tra)</option>
            <option value="terminal">⬭ Hình Oval (Đầu / Cuối)</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Biểu mẫu đính kèm</label>
          <input type="text" value={step.template_files || ""} onChange={(e) => onUpdate(stepIndex, "template_files", e.target.value)} placeholder="VD: G7.CL-01, Phiếu nhập kho..." style={fieldStyle} />
        </div>

        {step.node_type === "decision" && (
          <div style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Nhánh rẽ phụ</label>
              <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "11px", color: "#64748b" }}>
                <input type="checkbox" checked={step.has_branch === true} onChange={(e) => onUpdate(stepIndex, "has_branch", e.target.checked)} style={{ accentColor: "#7B5233" }} />
                Bật
              </label>
            </div>

            {step.has_branch === true && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Arrow legend */}
                <div style={{ fontSize: "10px", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "6px", padding: "6px 8px", lineHeight: "1.5" }}>
                  <b>⬇ Mũi tên xuống</b>: Đồng ý → Bước tiếp theo<br/>
                  <b>➡ Mũi tên phải</b>: Các nhánh rẽ phụ dưới đây
                </div>

                {failPath.map((node, ni) => (
                  <div key={ni} style={{ backgroundColor: "#FDF8F4", border: "1px solid #e67e22", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "9px", fontWeight: "700", color: "#e67e22", minWidth: "20px" }}>#{ni + 1}</span>
                      <input value={node.name} onChange={(e) => { const p = [...failPath]; p[ni] = { ...p[ni], name: e.target.value }; updateFailPath(p); }} placeholder="Tên hộp..." style={{ ...fieldStyle, fontSize: "11px", padding: "4px 6px", flex: 1 }} />
                      <button onClick={() => { const p = failPath.filter((_, i) => i !== ni); updateFailPath(p); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", padding: "0 2px", flexShrink: 0 }}>✕</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "4px" }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: "8px", marginBottom: "2px" }}>Nhãn mũi tên</label>
                        <input value={node.edge_label || ""} onChange={(e) => { const p = [...failPath]; p[ni] = { ...p[ni], edge_label: e.target.value }; updateFailPath(p); }} placeholder="VD: Không đạt" style={{ ...fieldStyle, fontSize: "10px", padding: "3px 5px" }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: "8px", marginBottom: "2px" }}>Bộ phận</label>
                        <select value={node.assignee_role || ""} onChange={(e) => { const p = [...failPath]; p[ni] = { ...p[ni], assignee_role: e.target.value }; updateFailPath(p); }} style={{ ...fieldStyle, fontSize: "10px", padding: "3px 5px" }}>
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: "8px", marginBottom: "2px" }}>Sau nhánh này → Về bước</label>
                      <select value={node.return_to_step || ""} onChange={(e) => { const p = [...failPath]; p[ni] = { ...p[ni], return_to_step: e.target.value ? parseInt(e.target.value) : null }; updateFailPath(p); }} style={{ ...fieldStyle, fontSize: "10px", padding: "3px 5px" }}>
                        <option value="">— Không kết nối lại —</option>
                        {(step._allSteps || []).map(s => (
                          <option key={s.step_number} value={s.step_number}>Bước {s.step_number}: {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                <button onClick={() => updateFailPath([...failPath, { name: "Nhánh mới", assignee_role: step.assignee_role || "QC", edge_label: "Không đạt", return_to_step: null }])} style={{ padding: "7px 0", backgroundColor: "#7B5233", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}>
                  + Thêm mũi tên / nhánh rẽ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #EADCC9" }}>
        <button onClick={() => { onDelete(stepIndex); onClose(); }} style={{ width: "100%", padding: "8px", backgroundColor: "#fff5f5", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#dc2626", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          🗑 Xóa bước này
        </button>
      </div>
    </div>
  );
};

// ─── Inner Canvas ──────────────────────────────────────────────────────────────
const STEP_X = 200; const STEP_Y_START = 60; const STEP_Y_GAP = 140;
const BRANCH_X_START = 420; const BRANCH_X_GAP = 180;

const FlowCanvas = ({ steps, onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect, selectedStepNumber, setSelectedStepNumber }) => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const buildGraph = useCallback(() => {
    const nodes = []; const edges = [];
    steps.forEach((step, idx) => {
      const stepId = `step-${step.step_number}`;
      const isFirst = idx === 0; const isLast = idx === steps.length - 1;
      const isDecision = step.node_type === "decision";
      let nodeType = step.node_type || "task";
      if (isFirst || isLast) nodeType = "terminal";
      if (isDecision) nodeType = "decision";
      const xPos = step.x_pos !== undefined ? step.x_pos : STEP_X;
      const yPos = step.y_pos !== undefined ? step.y_pos : STEP_Y_START + idx * STEP_Y_GAP;
      nodes.push({ id: stepId, type: nodeType, position: { x: xPos, y: yPos }, data: { label: step.name || `Bước ${step.step_number}`, stepNumber: step.step_number, roleLabel: formatRole(step.assignee_role), borderColor: isDecision ? "#e67e22" : (isFirst || isLast) ? "#1a6b3c" : "#334155" }, draggable: true });
      if (!isLast) {
        const next = steps[idx + 1];
        edges.push({ id: `e-${step.step_number}-${next.step_number}`, source: stepId, target: `step-${next.step_number}`, type: "smoothstep", label: isDecision ? "Đồng ý" : "", labelStyle: { fontSize: "9px", fontWeight: "bold", fill: "#334155" }, labelBgStyle: { fill: "white", fillOpacity: 0.85 }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 }, style: { stroke: "#334155", strokeWidth: 1.5 } });
      }
      if (isDecision && step.has_branch === true) {
        const fp = (step.fail_path && step.fail_path.length > 0) ? step.fail_path : [{ name: step.fail_node_name_1 || "Xử lý không phù hợp", assignee_role: step.assignee_role || "QC" }, { name: step.fail_node_name_3 || "Trả hàng", assignee_role: step.assignee_role || "QC" }];
        fp.forEach((pn, pi) => {
          const bid = `branch-${step.step_number}-${pi}`;
          const bx = pn.x_pos !== undefined ? pn.x_pos : BRANCH_X_START + pi * BRANCH_X_GAP;
          const by = pn.y_pos !== undefined ? pn.y_pos : yPos;
          nodes.push({ id: bid, type: pi === fp.length - 1 ? "branchOval" : "branchRect", position: { x: bx, y: by }, data: { label: pn.name, roleLabel: formatRole(pn.assignee_role) }, draggable: true });

          const edgeLabel = pn.edge_label || (pi === 0 ? "Không" : "");
          if (pi === 0) {
            edges.push({ id: `e-br-${step.step_number}-0`, source: stepId, sourceHandle: "right", target: bid, type: "smoothstep", label: edgeLabel, labelStyle: { fontSize: "9px", fontWeight: "bold", fill: "#e67e22" }, labelBgStyle: { fill: "white", fillOpacity: 0.85 }, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#e67e22" }, style: { stroke: "#e67e22", strokeWidth: 1.5 } });
          } else {
            edges.push({ id: `e-br-${step.step_number}-${pi}`, source: `branch-${step.step_number}-${pi - 1}`, target: bid, type: "smoothstep", label: edgeLabel, labelStyle: { fontSize: "9px", fontWeight: "bold", fill: "#e67e22" }, labelBgStyle: { fill: "white", fillOpacity: 0.85 }, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#e67e22" }, style: { stroke: "#e67e22", strokeWidth: 1.5 } });
          }

          // Mũi tên kết nối lại về bước cụ thể (return_to_step)
          if (pn.return_to_step) {
            edges.push({ id: `e-ret-${step.step_number}-${pi}`, source: bid, target: `step-${pn.return_to_step}`, type: "smoothstep", label: "→", labelStyle: { fontSize: "9px", fill: "#64748b" }, markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#64748b" }, style: { stroke: "#64748b", strokeWidth: 1.2, strokeDasharray: "5,3" } });
          }
        });
      }
    });
    return { nodes, edges };
  }, [steps]);

  const { nodes: iN, edges: iE } = useMemo(() => buildGraph(), [buildGraph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(iN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(iE);

  const stepsKey = steps.map(s => `${s.step_number}|${s.node_type}|${s.has_branch}|${s.name}|${JSON.stringify(s.fail_path || [])}`).join(";");
  useEffect(() => { const { nodes: n, edges: e } = buildGraph(); setNodes(n); setEdges(e); }, [stepsKey]);

  const onNodeDragStop = useCallback((_, node) => {
    if (!onPositionsChange) return;
    const { x, y } = node.position;
    if (node.id.startsWith("step-")) onPositionsChange({ type: "step", stepNumber: parseInt(node.id.replace("step-", "")), x, y });
    else if (node.id.startsWith("branch-")) { const p = node.id.split("-"); onPositionsChange({ type: "branch", stepNumber: parseInt(p[1]), branchIdx: parseInt(p[2]), x, y }); }
  }, [onPositionsChange]);

  const onNodeClick = useCallback((_, node) => {
    if (node.id.startsWith("step-")) {
      const sn = parseInt(node.id.replace("step-", ""));
      setSelectedStepNumber(sn);
      if (onNodeSelect) onNodeSelect(sn);
    }
  }, [setSelectedStepNumber, onNodeSelect]);

  const onPaneClick = useCallback(() => setSelectedStepNumber(null), [setSelectedStepNumber]);

  const onNodesDelete = useCallback((deleted) => {
    deleted.forEach(node => {
      if (node.id.startsWith("step-") && onDeleteStep) {
        const idx = steps.findIndex(s => s.step_number === parseInt(node.id.replace("step-", "")));
        if (idx >= 0) onDeleteStep(idx);
      }
    });
  }, [onDeleteStep, steps]);

  const onConnect = useCallback((conn) => { setEdges((eds) => addEdge({ ...conn, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }, eds)); }, [setEdges]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const nt = e.dataTransfer.getData("application/reactflow-nodetype");
    if (!nt || !onAddStep) return;
    onAddStep(nt, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [screenToFlowPosition, onAddStep]);

  const handleAutoLayout = useCallback(() => {
    const updated = nodes.map(node => {
      if (node.id.startsWith("step-")) {
        const sn = parseInt(node.id.replace("step-", ""));
        const si = steps.findIndex(s => s.step_number === sn);
        return { ...node, position: { x: STEP_X, y: STEP_Y_START + si * STEP_Y_GAP } };
      }
      if (node.id.startsWith("branch-")) {
        const p = node.id.split("-");
        const si = steps.findIndex(s => s.step_number === parseInt(p[1]));
        return { ...node, position: { x: BRANCH_X_START + parseInt(p[2]) * BRANCH_X_GAP, y: STEP_Y_START + si * STEP_Y_GAP } };
      }
      return node;
    });
    setNodes(updated);
    setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50);
  }, [nodes, steps, setNodes, fitView]);

  return (
    <div style={{ flex: 1, height: "100%", position: "relative" }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={onNodeDragStop} onNodeClick={onNodeClick} onPaneClick={onPaneClick} onNodesDelete={onNodesDelete} onConnect={onConnect} nodeTypes={nodeTypes} onDrop={onDrop} onDragOver={onDragOver} deleteKeyCode="Delete" fitView fitViewOptions={{ padding: 0.3 }} minZoom={0.25} maxZoom={2.5} proOptions={{ hideAttribution: true }}>
        <Background color="#e2d5c8" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={(n) => n.type === "decision" ? "#fff3e0" : n.type === "terminal" ? "#e8f5e9" : "#f0f0f0"} maskColor="rgba(250,246,240,0.6)" style={{ border: "1px solid #EADCC9" }} />
        <Panel position="top-right">
          <button onClick={handleAutoLayout} style={{ padding: "5px 12px", backgroundColor: "#7B5233", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "700", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "5px" }}>
            ⊞ Sắp xếp tự động
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// ─── Main Wrapper ──────────────────────────────────────────────────────────────
const FlowchartCanvasInner = ({ steps, onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect }) => {
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);
  const selectedStep = useMemo(() => steps.find(s => s.step_number === selectedStepNumber) || null, [steps, selectedStepNumber]);
  const selectedStepIndex = useMemo(() => steps.findIndex(s => s.step_number === selectedStepNumber), [steps, selectedStepNumber]);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <ShapePalette />
      <FlowCanvas steps={steps} onPositionsChange={onPositionsChange} onAddStep={onAddStep} onUpdateStep={onUpdateStep} onDeleteStep={onDeleteStep} onNodeSelect={onNodeSelect} selectedStepNumber={selectedStepNumber} setSelectedStepNumber={setSelectedStepNumber} />
      {selectedStep && (
        <PropertiesPanel
          step={{ ...selectedStep, _allSteps: steps.filter(s => s.step_number !== selectedStepNumber) }}
          stepIndex={selectedStepIndex}
          onUpdate={onUpdateStep}
          onDelete={onDeleteStep}
          onClose={() => setSelectedStepNumber(null)}
        />
      )}
    </div>
  );
};

const FlowchartCanvas = (props) => (
  <div style={{ width: "100%", height: "580px", borderRadius: "8px", border: "1px solid #EADCC9", overflow: "hidden" }}>
    <ReactFlowProvider>
      <FlowchartCanvasInner {...props} />
    </ReactFlowProvider>
  </div>
);

export default FlowchartCanvas;
