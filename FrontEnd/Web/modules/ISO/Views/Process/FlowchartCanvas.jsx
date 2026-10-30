import React, { useCallback, useMemo, useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Search } from "lucide-react";
import api from '@webShared/Services/api.service';
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState, addEdge,
  Handle, Position, MarkerType,
  useReactFlow, ReactFlowProvider,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Custom Minimal Nodes (Black & White, ISO Standard) ─────────────────────────
const nodeBase = (selected) => ({
  boxShadow: selected
    ? "0 0 0 2px #7B5233, 0 6px 14px rgba(123,82,51,0.25)"
    : "0 2px 6px rgba(0,0,0,0.06)",
  transition: "all 0.15s ease",
  cursor: "pointer",
});

// ─── Task Node (Rectangle - Process Step) ──────────────────────────────────────
const TaskNode = ({ data, selected }) => {
  return (
    <div style={{
      width: "185px",
      minHeight: "58px",
      border: selected ? "2px solid #7B5233" : "1.5px solid #000000",
      borderRadius: "3px",
      backgroundColor: selected ? "#FAF7F2" : "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Times New Roman', Times, serif",
      padding: "6px 10px",
      boxSizing: "border-box",
      position: "relative",
      ...nodeBase(selected)
    }}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", width: 7, height: 7 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", width: 7, height: 7, top: "50%" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", width: 7, height: 7, top: "50%" }} />
      
      {/* Header Badges: Step Number */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", width: "100%", marginBottom: "4px", pointerEvents: "none" }}>
        <span style={{ fontSize: "8.5px", fontWeight: "bold", background: "#000000", color: "#ffffff", padding: "1px 5px", borderRadius: "2px" }}>
          B{data.stepNumber}
        </span>
      </div>

      {/* Step Name */}
      <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textAlign: "center", lineHeight: "1.3", wordBreak: "break-word", pointerEvents: "none" }}>
        {data.label}
      </div>

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#000000", width: 7, height: 7 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: "#000000", width: 7, height: 7, top: "50%" }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: "#000000", width: 7, height: 7, top: "50%" }} />
    </div>
  );
};

// ─── Diamond Node (Decision Step - Quyết định) ──────────────────────────────────
const DiamondNode = ({ data, selected }) => {
  return (
    <div style={{
      position: "relative",
      width: "124px",
      height: "124px",
      ...nodeBase(selected)
    }}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, top: "-3px" }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, left: "-3px", top: "62px" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, right: "-3px", top: "62px" }} />

      <svg width="124" height="124" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon
          points="62,3 121,62 62,121 3,62"
          fill={selected ? "#FAF7F2" : "#ffffff"}
          stroke={selected ? "#7B5233" : "#000000"}
          strokeWidth={selected ? "2.5" : "1.5"}
        />
      </svg>
      
      <div style={{
        position: "absolute", top: 0, left: 0, width: "124px", height: "124px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Times New Roman', Times, serif", padding: "16px", boxSizing: "border-box",
        pointerEvents: "none", zIndex: 2
      }}>
        <span style={{ fontSize: "8.5px", fontWeight: "bold", background: "#000000", color: "#ffffff", padding: "1px 5px", borderRadius: "2px", marginBottom: "3px" }}>
          B{data.stepNumber}
        </span>
        <div style={{ fontSize: "10.5px", fontWeight: "bold", color: "#000000", textAlign: "center", lineHeight: "1.2", wordBreak: "break-word" }}>
          {data.label}
        </div>
      </div>

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, bottom: "-3px" }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, left: "-3px", top: "62px" }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, right: "-3px", top: "62px" }} />
    </div>
  );
};

// ─── Oval Node (Terminal Step - Bắt đầu / Kết thúc - True Mathematical Ellipse) ──
const OvalNode = ({ data, selected }) => {
  const w = 185;
  const h = 58;
  return (
    <div style={{
      position: "relative",
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: "50%",
      ...nodeBase(selected)
    }}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, top: "-3px" }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, left: "-3px", top: `${h / 2}px` }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, right: "-3px", top: `${h / 2}px` }} />

      {/* SVG True Mathematical Ellipse (Hình Elip chuẩn 100% không cạnh thẳng) */}
      <svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w / 2 - 2}
          ry={h / 2 - 2}
          fill={selected ? "#FAF7F2" : "#ffffff"}
          stroke={selected ? "#7B5233" : "#000000"}
          strokeWidth={selected ? "2.5" : "1.5"}
        />
      </svg>
      
      {/* Content overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: `${w}px`,
        height: `${h}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Times New Roman', Times, serif",
        padding: "4px 22px",
        boxSizing: "border-box",
        pointerEvents: "none",
        zIndex: 2
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: "1px" }}>
          <span style={{ fontSize: "8px", fontWeight: "bold", background: "#000000", color: "#ffffff", padding: "1px 6px", borderRadius: "10px" }}>
            B{data.stepNumber}
          </span>
        </div>
        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textAlign: "center", lineHeight: "1.25", wordBreak: "break-word", maxWidth: "140px" }}>
          {data.label}
        </div>
      </div>

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, bottom: "-3px" }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, left: "-3px", top: `${h / 2}px` }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: "#000000", zIndex: 10, width: 7, height: 7, right: "-3px", top: `${h / 2}px` }} />
    </div>
  );
};

// ─── Circle Node (Start / Connector - Bắt đầu / Đầu nối) ──────────────────────
const CircleNode = ({ data, selected }) => {
  return (
    <div style={{
      width: "80px",
      height: "80px",
      borderRadius: "50%",
      border: selected ? "2.5px solid #7B5233" : "1.5px solid #000000",
      backgroundColor: selected ? "#FAF7F2" : "#ffffff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Times New Roman', Times, serif",
      padding: "6px",
      boxSizing: "border-box",
      position: "relative",
      ...nodeBase(selected)
    }}>
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", width: 7, height: 7, top: "-3px" }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", width: 7, height: 7, left: "-3px", top: "50%" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", width: 7, height: 7, right: "-3px", top: "50%" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: "2px", pointerEvents: "none" }}>
        <span style={{ fontSize: "8px", fontWeight: "bold", background: "#000000", color: "#ffffff", padding: "1px 5px", borderRadius: "10px" }}>
          B{data.stepNumber}
        </span>
      </div>

      <div style={{ fontSize: "9.5px", fontWeight: "bold", color: "#000000", textAlign: "center", lineHeight: "1.1", wordBreak: "break-word", pointerEvents: "none", maxHeight: "40px", overflow: "hidden" }}>
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#000000", width: 7, height: 7, bottom: "-3px" }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: "#000000", width: 7, height: 7, left: "-3px", top: "50%" }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: "#000000", width: 7, height: 7, right: "-3px", top: "50%" }} />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
  decision: DiamondNode,
  terminal: OvalNode,
  start: OvalNode,
  end: OvalNode,
  circle: CircleNode,
  start_circle: CircleNode,
  default: TaskNode,
};

// ─── Minimal Edge with Double Click Inline Editing ──────────────────────────────
const MinimalEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, label, data,
}) => {
  const [editing, setEditing] = useState(false);
  const [labelText, setLabelText] = useState(label || "");
  const inputRef = useRef(null);

  useEffect(() => { setLabelText(label || ""); }, [label]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    borderRadius: 4
  });

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    if (data?.onLabelChange) {
      data.onLabelChange(id, labelText);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleBlur();
    if (e.key === "Escape") { setLabelText(label || ""); setEditing(false); }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: 1.5, ...style }} />
      {label !== undefined && label !== "" && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
            }}
            className="nodrag nopan"
            onDoubleClick={handleDoubleClick}
          >
            {editing ? (
              <input
                ref={inputRef}
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={{
                  width: "70px",
                  padding: "1px 4px",
                  fontSize: "10px",
                  border: "1px solid #000000",
                  textAlign: "center",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  fontFamily: "'Times New Roman', Times, serif"
                }}
              />
            ) : (
              <div
                style={{
                  padding: "1px 6px",
                  fontSize: "9px",
                  fontWeight: "bold",
                  backgroundColor: data?.isPass ? "#DCFCE7" : (data?.isFail ? "#FEE2E2" : "#ffffff"),
                  border: data?.isPass ? "1px solid #15803D" : (data?.isFail ? "1px solid #DC2626" : "1px solid #000000"),
                  borderRadius: "2px",
                  color: data?.isPass ? "#15803D" : (data?.isFail ? "#DC2626" : "#000000"),
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  fontFamily: "'Times New Roman', Times, serif",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
                title="Double-click để sửa nhãn"
              >
                {labelText}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = { minimal: MinimalEdge };

// ─── Shape Palette (Clean Black & White) ─────────────────────────────────────────
const PALETTE = [
  {
    type: "task", label: "Bước Xử Lý",
    icon: <div style={{ width: 44, height: 24, border: "1.5px solid #000000", backgroundColor: "#ffffff", borderRadius: 2 }} />
  },
  {
    type: "decision", label: "Quyết Định",
    icon: <svg width={36} height={36}><polygon points="18,2 34,18 18,34 2,18" fill="#ffffff" stroke="#000000" strokeWidth="1.5" /></svg>
  },
  {
    type: "terminal", label: "Elip / B.Đầu - K.Thúc",
    icon: <svg width={44} height={22}><ellipse cx={22} cy={11} rx={20} ry={9} fill="#ffffff" stroke="#000000" strokeWidth="1.5" /></svg>
  },
  {
    type: "circle", label: "Tròn / Bắt đầu",
    icon: <div style={{ width: 26, height: 26, border: "1.5px solid #000000", borderRadius: "50%", backgroundColor: "#ffffff" }} />
  },
];

const ShapePalette = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ width: "94px", flexShrink: 0, backgroundColor: "#FAF7F2", borderRight: "1px solid #EADCC9", padding: "16px 4px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
      <div style={{ fontSize: "9px", fontWeight: "bold", color: "#7B5233", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hình Khối</div>
      
      {PALETTE.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow-nodetype", item.type);
            e.dataTransfer.effectAllowed = "move";
          }}
          onMouseEnter={() => setHovered(item.type)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
            cursor: "grab", padding: "6px 4px", width: "100%", userSelect: "none",
            backgroundColor: hovered === item.type ? "#FFFFFF" : "transparent",
            borderRadius: "6px", border: "1px dashed transparent",
            borderColor: hovered === item.type ? "#7B5233" : "transparent",
            transition: "all 0.15s ease"
          }}
          title={`Kéo thả khối ${item.label} vào canvas`}
        >
          {item.icon}
          <span style={{ fontSize: "9px", fontWeight: "bold", color: "#334155", textAlign: "center" }}>{item.label}</span>
        </div>
      ))}
      
      <div style={{ borderTop: "1px solid #EADCC9", width: "80%", marginTop: "8px", paddingTop: "8px", textAlign: "center" }}>
        <span style={{ fontSize: "8px", color: "#94a3b8" }}>Kéo thả vào canvas</span>
      </div>
    </div>
  );
};

// ─── Properties Panel (Thanh sửa chi tiết thuộc tính bước) ───────────────────────
const COMMON_ROLES = [
  "Bộ phận Hành chính / Nhân sự",
  "Bộ phận Nhân sự",
  "Trưởng phòng Nhân sự / Ban BSCI",
  "Ban Giám đốc",
  "Bộ phận QLCL (QC)",
  "Phòng Sản xuất",
  "Phòng Kinh doanh / Bán hàng",
  "Phòng Mua hàng / Thu mua"
];

const PropertiesPanel = ({ step, stepIndex, steps, relatedTemplates = [], dbTemplates = [], onUpdate, onDelete, onClose, onOpenFormPicker }) => {
  if (!step) return null;
  const isDecision = step.node_type === "decision";
  const currentFailPath = (step.fail_path && step.fail_path.length > 0) ? step.fail_path[0] : null;

  return (
    <div style={{
      width: "270px",
      flexShrink: 0,
      backgroundColor: "#ffffff",
      borderLeft: "1px solid #EADCC9",
      display: "flex",
      flexDirection: "column",
      boxShadow: "-2px 0 8px rgba(0,0,0,0.04)",
      zIndex: 20
    }}>
      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #EADCC9", backgroundColor: "#FAF7F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: "bold", background: "#7B5233", color: "#ffffff", padding: "2px 6px", borderRadius: "3px" }}>
            Bước {step.step_number}
          </span>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#1E293B" }}>
            Cấu hình khối
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "bold", color: "#64748B", padding: "0 4px" }}
          title="Đóng bảng"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Tên bước */}
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Tên bước thực hiện:
          </label>
          <textarea
            rows="2"
            value={step.name || ""}
            onChange={(e) => onUpdate(stepIndex, "name", e.target.value)}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px", outline: "none", fontFamily: "'Times New Roman', Times, serif", boxSizing: "border-box" }}
          />
        </div>

        {/* Loại hình khối */}
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Loại hình khối:
          </label>
          <select
            value={step.node_type || "task"}
            onChange={(e) => onUpdate(stepIndex, "node_type", e.target.value)}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px", backgroundColor: "white", outline: "none", boxSizing: "border-box" }}
          >
            <option value="task">▭ Bước Xử Lý (Chữ nhật)</option>
            <option value="decision">◇ Quyết Định (Hình thoi Yes/No)</option>
            <option value="terminal">⬭ Elip / Oval (Bắt đầu / Kết thúc - ISO)</option>
            <option value="circle">○ Hình tròn (Điểm Bắt đầu)</option>
          </select>
        </div>

        {/* Bộ phận trách nhiệm */}
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Bộ phận / Trách nhiệm:
          </label>
          <input
            value={step.assignee_role || ""}
            onChange={(e) => onUpdate(stepIndex, "assignee_role", e.target.value)}
            placeholder="Nhập hoặc chọn bộ phận..."
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px", outline: "none", boxSizing: "border-box", marginBottom: "6px" }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {COMMON_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onUpdate(stepIndex, "assignee_role", r)}
                style={{
                  fontSize: "8px",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  border: "1px solid #E2E8F0",
                  backgroundColor: step.assignee_role === r ? "#FAF6F0" : "#F8FAFC",
                  color: step.assignee_role === r ? "#7B5233" : "#475569",
                  fontWeight: step.assignee_role === r ? "bold" : "normal",
                  cursor: "pointer"
                }}
              >
                {r.length > 20 ? r.substring(0, 18) + '...' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Bước tiếp theo (Thuận chiều) */}
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Bước tiếp theo (Đạt / Thuận chiều):
          </label>
          <select
            value={step.transition?.next_step !== undefined ? step.transition?.next_step : (stepIndex < steps.length - 1 ? steps[stepIndex + 1].step_number : "")}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : null;
              onUpdate(stepIndex, "transition", { ...(step.transition || {}), next_step: val });
            }}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "11px", backgroundColor: "white", outline: "none", boxSizing: "border-box" }}
          >
            <option value="">(Tự động bước kế tiếp)</option>
            {steps.filter(s => s.step_number !== step.step_number).map(s => (
              <option key={s.step_number} value={s.step_number}>
                Bước {s.step_number}: {s.name ? (s.name.length > 25 ? s.name.substring(0, 22) + '...' : s.name) : `Bước ${s.step_number}`}
              </option>
            ))}
          </select>
        </div>

        {/* Cấu hình Nhánh Quyết định nếu là Diamond */}
        {isDecision && (
          <div style={{ backgroundColor: "#FAF7F2", padding: "10px", borderRadius: "4px", border: "1px solid #EADCC9" }}>
            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#7B5233", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
              Nhánh Không Đạt (Quay lại):
            </label>
            <select
              value={currentFailPath?.return_to_step || Math.max(1, step.step_number - 1)}
              onChange={(e) => {
                const targetStep = parseInt(e.target.value);
                const updatedFp = [{
                  return_to_step: targetStep,
                  edge_label: currentFailPath?.edge_label || (/phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt")
                }];
                onUpdate(stepIndex, "fail_path", updatedFp);
                onUpdate(stepIndex, "has_branch", true);
              }}
              style={{ width: "100%", padding: "5px 6px", border: "1px solid #CBD5E1", borderRadius: "4px", fontSize: "10.5px", backgroundColor: "white", outline: "none", boxSizing: "border-box", marginBottom: "6px" }}
            >
              {steps.filter(s => s.step_number < step.step_number).map(s => (
                <option key={s.step_number} value={s.step_number}>
                  Quay lại Bước {s.step_number}
                </option>
              ))}
            </select>

            <label style={{ fontSize: "8.5px", color: "#64748B", display: "block", marginBottom: "2px" }}>
              Nhãn nhánh lỗi:
            </label>
            <input
              value={currentFailPath?.edge_label || (/phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt")}
              onChange={(e) => {
                const updatedFp = [{
                  return_to_step: currentFailPath?.return_to_step || Math.max(1, step.step_number - 1),
                  edge_label: e.target.value
                }];
                onUpdate(stepIndex, "fail_path", updatedFp);
              }}
              style={{ width: "100%", padding: "4px 6px", border: "1px solid #CBD5E1", borderRadius: "3px", fontSize: "10.5px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Biểu mẫu / Hồ sơ áp dụng (gộp 1 ô, nhấp vào mở popup CSDL như ảnh 2) */}
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Biểu mẫu / Hồ sơ áp dụng:
          </label>
          <div
            onClick={() => {
              if (onOpenFormPicker) {
                onOpenFormPicker(stepIndex);
              }
            }}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              width: "100%"
            }}
            title="Nhấp để tìm kiếm và chọn biểu mẫu từ CSDL"
          >
            <input
              type="text"
              readOnly
              value={step.template_files || ""}
              placeholder="Chọn biểu mẫu từ CSDL..."
              style={{
                width: "100%",
                height: "34px",
                padding: "4px 28px 4px 8px",
                borderRadius: "4px",
                border: "1px solid #CBD5E1",
                fontSize: "11px",
                backgroundColor: "#FFFFFF",
                color: step.template_files ? "#1E293B" : "#94A3B8",
                cursor: "pointer",
                boxSizing: "border-box",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                overflow: "hidden"
              }}
            />
            <Search
              size={14}
              style={{
                position: "absolute",
                right: "8px",
                color: "#7B5233",
                pointerEvents: "none",
                opacity: 0.8
              }}
            />
          </div>
        </div>

        {/* Diễn giải chi tiết / Hướng dẫn thực hiện bước (Mục 5.2) */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748B", textTransform: "uppercase" }}>
              Diễn giải / Giải thích bước (Mục 5.2):
            </label>
            <button
              type="button"
              onClick={() => {
                const stepRole = step.assignee_role || "Bộ phận phụ trách";
                const stepName = step.name || `Bước ${step.step_number}`;
                const tpl = step.template_files || "---";
                const defaultSample = `• Trách nhiệm thực hiện: ${stepRole}\n• Nội dung công việc: ${stepRole} chủ trì phối hợp với các phòng ban tiến hành ${stepName.toLowerCase()} theo đúng tiêu chuẩn kỹ thuật và quy định áp dụng.\n• Hồ sơ / Biểu mẫu kiểm soát áp dụng: ${tpl}`;
                onUpdate(stepIndex, "instructions", defaultSample);
              }}
              style={{
                fontSize: "8.5px",
                padding: "2px 6px",
                borderRadius: "3px",
                border: "1px solid #EADCC9",
                backgroundColor: "#FAF7F2",
                color: "#7B5233",
                cursor: "pointer",
                fontWeight: "bold"
              }}
              title="Điền nội dung gợi ý chuẩn ISO"
            >
              + Mẫu gợi ý
            </button>
          </div>
          <textarea
            rows="4"
            value={step.instructions ? (
              step.instructions.startsWith("<") 
                ? step.instructions.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n').replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1').replace(/&nbsp;/g, ' ').trim()
                : step.instructions
            ) : ""}
            onChange={(e) => onUpdate(stepIndex, "instructions", e.target.value)}
            placeholder="Nhập hướng dẫn chi tiết cách thức thực hiện bước này (trách nhiệm, thao tác, tiêu chuẩn)..."
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              fontSize: "11px",
              lineHeight: "1.4",
              outline: "none",
              fontFamily: "'Times New Roman', Times, serif",
              resize: "vertical",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #EADCC9", backgroundColor: "#FAF7F2", display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => { onDelete(stepIndex); onClose(); }}
          style={{ flex: 1, padding: "6px", backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "4px", color: "#DC2626", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
        >
          Xóa khối này
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: "6px 12px", backgroundColor: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "4px", color: "#475569", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

// ─── Flowchart Canvas Component ─────────────────────────────────────────────────
const FlowCanvas = ({ steps, onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect, selectedStepNumber, setSelectedStepNumber, canvasRef }) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const edgeLabelMapRef = useRef({});

  // Helper to calculate dimensions based on node type
  const getNodeDimensions = useCallback((nodeType) => {
    if (nodeType === "circle" || nodeType === "start_circle") return { width: 80, height: 80 };
    if (nodeType === "decision") return { width: 124, height: 124 };
    if (nodeType === "terminal" || nodeType === "start" || nodeType === "end") return { width: 185, height: 58 };
    return { width: 185, height: 58 }; // task
  }, []);

  // Helper to calculate center coordinates for a step
  const getStepCenter = useCallback((step, nodeType) => {
    const x = step.x_pos !== undefined ? step.x_pos : 280;
    const y = step.y_pos !== undefined ? step.y_pos : 60;
    const { width, height } = getNodeDimensions(nodeType || step.node_type);
    return { x: x + width / 2, y: y + height / 2 };
  }, [getNodeDimensions]);

  // Helper to select best handles between two steps
  const getBestHandles = useCallback((srcStep, tgtStep, srcType, tgtType) => {
    if (!srcStep || !tgtStep) return { sourceHandle: "bottom", targetHandle: "top" };
    const srcCent = getStepCenter(srcStep, srcType);
    const tgtCent = getStepCenter(tgtStep, tgtType);
    
    const dx = tgtCent.x - srcCent.x;
    const dy = tgtCent.y - srcCent.y;

    // Target is above source -> Loop back on right side
    if (dy < -20) {
      return { sourceHandle: "right", targetHandle: "right-target" };
    }

    // Significantly to the left
    if (dx < -40) {
      return { sourceHandle: "left", targetHandle: "right-target" };
    }

    // Significantly to the right
    if (dx > 40) {
      return { sourceHandle: "right", targetHandle: "left-target" };
    }

    // Vertically aligned -> Top to bottom
    return { sourceHandle: "bottom", targetHandle: "top" };
  }, [getStepCenter]);

  // ─── Build Graph ─────────────────────────────────────────────────────────────
  const buildGraph = useCallback((currentEdgeLabels) => {
    const nodes = [];
    const edges = [];
    const totalSteps = steps.length;

    // 1. Process steps and auto-deduce node types if unassigned (Normalize start/end to terminal)
    const processedSteps = steps.map((step, idx) => {
      let nodeType = (step.node_type || "").toLowerCase();
      const stepName = (step.name || "").toLowerCase();

      // Nếu người dùng đã chọn cụ thể circle / decision / terminal thì giữ nguyên
      if (nodeType === "circle" || nodeType === "start_circle") {
        return { ...step, node_type: "circle" };
      }
      if (nodeType === "decision") {
        return { ...step, node_type: "decision" };
      }
      if (nodeType === "terminal" || nodeType === "start" || nodeType === "end") {
        return { ...step, node_type: "terminal" };
      }

      // Tự động suy luận nếu chưa có nodeType hoặc đang để task mặc định
      if (idx === 0 || /bắt đầu|tiếp nhận/i.test(stepName)) {
        nodeType = "terminal";
      } else if (idx === totalSteps - 1 || /kết thúc|lưu\s*hồ\s*sơ|lưu\s*trữ|hoàn\s*tất|nghiệm\s*thu|đóng/i.test(stepName)) {
        // BƯỚC CUỐI CÙNG LUÔN LUÔN LÀ KẾT THÚC (ELIP/TERMINAL)
        nodeType = "terminal";
      } else if (/phê duyệt|quyết định|kiểm tra|thẩm định|đối chiếu/i.test(stepName) || (step.fail_path && step.fail_path.length > 0)) {
        nodeType = "decision";
      } else {
        nodeType = "task";
      }
      return { ...step, node_type: nodeType };
    });

    // 2. Build Nodes
    processedSteps.forEach((step, idx) => {
      const stepId = `step-${step.step_number}`;
      const isDecision = step.node_type === "decision";
      const { width } = getNodeDimensions(step.node_type);

      // Default layout: Align down the center at X = 320
      const xPos = step.x_pos !== undefined ? step.x_pos : (360 - width / 2);
      const yPos = step.y_pos !== undefined ? step.y_pos : (50 + idx * 130);

      nodes.push({
        id: stepId,
        type: step.node_type || "task",
        position: { x: xPos, y: yPos },
        selected: selectedStepNumber === step.step_number,
        data: {
          label: step.name || `Bước ${step.step_number}`,
          stepNumber: step.step_number,
          role: step.assignee_role || "",
          _hasOutput: true,
        },
        draggable: true,
      });

      // 3. Build Edges (transitions)
      // Check explicit transition next_step
      let next = step.transition?.next_step;
      // If not defined, fallback to sequential next step
      if (next === undefined || next === null) {
        if (idx < totalSteps - 1) {
          next = processedSteps[idx + 1].step_number;
        }
      }

      if (next) {
        const nextStep = processedSteps.find(s => s.step_number === next);
        let { sourceHandle, targetHandle } = getBestHandles(step, nextStep, step.node_type, nextStep?.node_type);
        
        // Với khối Quyết định, nhánh thuận (Đồng ý / Đạt) luôn đi ra từ đáy (bottom) nếu bước tiếp theo nằm bên dưới
        if (isDecision) {
          const dy = (nextStep?.y_pos !== undefined ? nextStep.y_pos : (50 + (idx + 1) * 130)) - (step.y_pos !== undefined ? step.y_pos : (50 + idx * 130));
          if (dy > 0) {
            sourceHandle = "bottom";
            targetHandle = "top";
          }
        }

        const edgeId = `e-${step.step_number}-${next}`;
        const isApproval = /phê duyệt|quyết định/i.test(step.name || "");
        const defaultLabel = isDecision ? (isApproval ? "Đồng ý" : "Đạt") : "";
        const savedLabel = currentEdgeLabels[edgeId] !== undefined ? currentEdgeLabels[edgeId] : defaultLabel;
        
        edges.push({
          id: edgeId,
          source: stepId,
          sourceHandle: sourceHandle || "bottom",
          target: `step-${next}`,
          targetHandle: targetHandle || "top",
          type: "minimal",
          data: {
            fromDecision: isDecision,
            isPass: isDecision,
            onLabelChange: null,
          },
          label: savedLabel,
          style: isDecision ? { stroke: "#15803D", strokeWidth: 1.5 } : { stroke: "#000000", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: isDecision ? "#15803D" : "#000000" },
        });
      }

      // 4. Build Decision Fail branch Edges
      if (isDecision) {
        const fp = (step.fail_path && step.fail_path.length > 0) ? step.fail_path : [
          { return_to_step: Math.max(1, step.step_number - 1), edge_label: /phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt" }
        ];

        fp.forEach((pn) => {
          if (pn.return_to_step) {
            const targetStep = processedSteps.find(s => s.step_number === pn.return_to_step);
            const { sourceHandle, targetHandle } = getBestHandles(step, targetStep, step.node_type, targetStep?.node_type);
            const edgeId = `e-fail-${step.step_number}-${pn.return_to_step}`;
            const defaultFailLabel = pn.edge_label || (/phê duyệt|quyết định/i.test(step.name || "") ? "Không đồng ý" : "K.Đạt");
            const savedLabel = currentEdgeLabels[edgeId] !== undefined ? currentEdgeLabels[edgeId] : defaultFailLabel;
            
            edges.push({
              id: edgeId,
              source: stepId,
              sourceHandle: sourceHandle || "right",
              target: `step-${pn.return_to_step}`,
              targetHandle: targetHandle || "right-target",
              type: "minimal",
              data: {
                fromDecision: true,
                isFail: true,
                onLabelChange: null,
              },
              label: savedLabel,
              style: { stroke: "#DC2626", strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#DC2626" },
            });
          }
        });
      }
    });

    return { nodes, edges };
  }, [steps, selectedStepNumber, getNodeDimensions, getBestHandles]);

  const { nodes: iN, edges: iE } = useMemo(() => buildGraph(edgeLabelMapRef.current), [buildGraph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(iN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(iE);

  // Label editing handler
  const handleEdgeLabelChange = useCallback((edgeId, newLabel) => {
    edgeLabelMapRef.current[edgeId] = newLabel;
    
    const match = edgeId.match(/^e-fail-(\d+)-(\d+)$/);
    if (match && onUpdateStep) {
      const sourceStepNum = parseInt(match[1]);
      const targetStepNum = parseInt(match[2]);
      const sourceStepIdx = steps.findIndex(s => s.step_number === sourceStepNum);
      if (sourceStepIdx >= 0) {
        const fp = steps[sourceStepIdx].fail_path || [];
        const updatedFp = fp.map(item => 
          item.return_to_step === targetStepNum ? { ...item, edge_label: newLabel } : item
        );
        onUpdateStep(sourceStepIdx, "fail_path", updatedFp);
      }
    }
    
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, label: newLabel } : e));
  }, [setEdges, steps, onUpdateStep]);

  // Inject label callback
  useEffect(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data, onLabelChange: handleEdgeLabelChange }
    })));
  }, [handleEdgeLabelChange, setEdges]);

  // Sync state when steps change
  const stepsKey = steps.map(s => `${s.step_number}|${s.node_type}|${s.name}|${s.assignee_role}|${s.x_pos}|${s.y_pos}|${JSON.stringify(s.transition || {})}|${JSON.stringify(s.fail_path || [])}`).join(";");
  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(edgeLabelMapRef.current);
    const edgesWithHandler = e.map(edge => ({
      ...edge,
      data: { ...edge.data, onLabelChange: handleEdgeLabelChange }
    }));
    setNodes(n);
    setEdges(edgesWithHandler);
  }, [stepsKey, selectedStepNumber]);

  // Connection validation
  const isValidConnection = useCallback((connection) => {
    if (connection.source === connection.target) return false;
    return true;
  }, []);

  // Sync position drag
  const onNodeDragStop = useCallback((_, node) => {
    if (!onPositionsChange) return;
    const { x, y } = node.position;
    if (node.id.startsWith("step-")) {
      const stepNumber = parseInt(node.id.replace("step-", ""));
      onPositionsChange({ type: "step", stepNumber, x, y });
    }
  }, [onPositionsChange]);

  const onNodeClick = useCallback((_, node) => {
    if (node.id.startsWith("step-")) {
      const sn = parseInt(node.id.replace("step-", ""));
      setSelectedStepNumber(sn);
      if (onNodeSelect) onNodeSelect(sn);
    }
  }, [setSelectedStepNumber, onNodeSelect]);

  const onPaneClick = useCallback(() => {
    setSelectedStepNumber(null);
  }, [setSelectedStepNumber]);

  // Connect handler
  const onConnect = useCallback((conn) => {
    const sourceStepNum = parseInt(conn.source.replace("step-", ""));
    const targetStepNum = parseInt(conn.target.replace("step-", ""));
    const sourceStepIdx = steps.findIndex(s => s.step_number === sourceStepNum);
    const sourceStep = steps[sourceStepIdx];

    if (!sourceStep) return;

    if (sourceStep.node_type === "decision") {
      if (conn.sourceHandle === "bottom") {
        onUpdateStep(sourceStepIdx, "transition", { ...(sourceStep.transition || {}), next_step: targetStepNum });
      } else {
        const fp = sourceStep.fail_path || [];
        const isRight = conn.sourceHandle === "right";
        const label = isRight ? "K.Đạt" : "Không đạt";
        const updatedFp = [...fp, { name: "Xử lý lỗi", assignee_role: sourceStep.assignee_role || "", edge_label: label, return_to_step: targetStepNum }];
        onUpdateStep(sourceStepIdx, "fail_path", updatedFp);
        onUpdateStep(sourceStepIdx, "has_branch", true);
      }
    } else {
      onUpdateStep(sourceStepIdx, "transition", { ...(sourceStep.transition || {}), next_step: targetStepNum });
    }
  }, [steps, onUpdateStep]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const nt = e.dataTransfer.getData("application/reactflow-nodetype");
    if (!nt || !onAddStep) return;
    onAddStep(nt, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [screenToFlowPosition, onAddStep]);

  // Auto Layout implementation
  const handleAutoLayout = useCallback(() => {
    const positions = {};
    const centerCol = 360;

    steps.forEach((step, idx) => {
      const isDecision = step.node_type === 'decision' || /phê duyệt|quyết định|kiểm tra|đối chiếu/i.test(step.name || "");
      const { width } = getNodeDimensions(isDecision ? "decision" : (step.node_type || "task"));
      
      positions[step.step_number] = {
        x: centerCol - width / 2,
        y: 50 + idx * 130
      };
    });

    const updatedNodes = nodes.map(node => {
      if (node.id.startsWith("step-")) {
        const stepNum = parseInt(node.id.replace("step-", ""));
        const pos = positions[stepNum];
        if (pos) {
          if (onPositionsChange) {
            onPositionsChange({ type: "step", stepNumber: stepNum, x: pos.x, y: pos.y });
          }
          return { ...node, position: { x: pos.x, y: pos.y } };
        }
      }
      return node;
    });

    setNodes(updatedNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
  }, [nodes, steps, getNodeDimensions, onPositionsChange, fitView, setNodes]);

  useImperativeHandle(canvasRef, () => ({
    triggerAutoLayout: () => {
      handleAutoLayout();
    }
  }));

  return (
    <div style={{ flex: 1, height: "100%", position: "relative", backgroundColor: "#ffffff" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        deleteKeyCode="Delete"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

// ─── Flowchart Canvas Inner Wrapper ──────────────────────────────────────────────
const FlowchartCanvasInner = ({ steps, relatedTemplates = [], onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect, selectedStepIdx, canvasRef, onOpenFormPicker }) => {
  const [internalSelectedStepNumber, setInternalSelectedStepNumber] = useState(null);
  const [dbTemplates, setDbTemplates] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.get('/iso-documents/form-templates')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted) setDbTemplates(list);
      })
      .catch(err => {
        console.warn("Could not load db templates:", err);
      });
    return () => { isMounted = false; };
  }, []);

  const selectedStepNumber = internalSelectedStepNumber !== null
    ? internalSelectedStepNumber
    : (selectedStepIdx !== -1 && steps[selectedStepIdx] ? steps[selectedStepIdx].step_number : null);

  const selectedStep = steps.find(s => s.step_number === selectedStepNumber);
  const selectedStepIndex = steps.findIndex(s => s.step_number === selectedStepNumber);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: "#ffffff", position: "relative", overflow: "hidden" }}>
      <ShapePalette />
      <FlowCanvas
        steps={steps}
        onPositionsChange={onPositionsChange}
        onAddStep={onAddStep}
        onUpdateStep={onUpdateStep}
        onDeleteStep={onDeleteStep}
        onNodeSelect={(sn) => {
          setInternalSelectedStepNumber(sn);
          if (onNodeSelect) onNodeSelect(sn);
        }}
        selectedStepNumber={selectedStepNumber}
        setSelectedStepNumber={setInternalSelectedStepNumber}
        canvasRef={canvasRef}
      />
      {selectedStep && (
        <PropertiesPanel
          step={selectedStep}
          stepIndex={selectedStepIndex}
          steps={steps}
          relatedTemplates={relatedTemplates}
          dbTemplates={dbTemplates}
          onUpdate={onUpdateStep}
          onDelete={onDeleteStep}
          onClose={() => setInternalSelectedStepNumber(null)}
          onOpenFormPicker={onOpenFormPicker}
        />
      )}
    </div>
  );
};

// ─── Main Exportable FlowchartCanvas ─────────────────────────────────────────────
const FlowchartCanvas = forwardRef((props, ref) => (
  <div style={{
    width: "100%",
    height: props.height || "640px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    overflow: "hidden",
    boxSizing: "border-box",
    ...props.style
  }}>
    <ReactFlowProvider>
      <FlowchartCanvasInner {...props} canvasRef={ref} />
    </ReactFlowProvider>
  </div>
));

export default FlowchartCanvas;
