import React, { useCallback, useMemo, useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Handle, Position, MarkerType,
  useReactFlow, ReactFlowProvider, Panel,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Custom Minimal Nodes (Black & White, Sharp Corners) ─────────────────────────
const nodeBase = (selected) => ({
  boxShadow: selected
    ? "0 0 0 2px #000000, 0 4px 10px rgba(0,0,0,0.15)"
    : "0 1px 3px rgba(0,0,0,0.05)",
  transition: "box-shadow 0.2s ease, border-color 0.2s ease",
  cursor: "grab",
});

// ─── Task Node (Rectangle - Process Step) ──────────────────────────────────────
const TaskNode = ({ data, selected }) => {
  const hasOutput = data._hasOutput;

  return (
    <div style={{
      width: "140px",
      height: "54px",
      border: "1.5px solid #000000",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      fontWeight: "bold",
      color: "#000000",
      textAlign: "center",
      padding: "6px 10px",
      boxSizing: "border-box",
      ...nodeBase(selected)
    }}>
      {/* Inputs (Top, Left, Right) */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", width: 6, height: 6 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", width: 6, height: 6, top: "50%" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", width: 6, height: 6, top: "50%" }} />
      
      <div style={{ wordBreak: "break-word", lineHeight: "1.3" }}>{data.label}</div>

      {/* Output (Bottom, Left, Right) - Only 1 output allowed */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          top: "50%",
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          top: "50%",
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
    </div>
  );
};

// ─── Diamond Node (Decision Step) ──────────────────────────────────────────────
const DiamondNode = ({ data, selected }) => {
  return (
    <div style={{
      position: "relative",
      width: "86px",
      height: "86px",
      ...nodeBase(selected)
    }}>
      {/* Inputs (Top, Left, Right) */}
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", zIndex: 10, width: 6, height: 6 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", zIndex: 10, width: 6, height: 6, top: "43px" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", zIndex: 10, width: 6, height: 6, top: "43px" }} />

      <svg width="86" height="86" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon
          points="43,2 84,43 43,84 2,43"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1.5"
        />
      </svg>
      
      <div style={{
        position: "absolute", top: 0, left: 0, width: "86px", height: "86px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Arial, sans-serif", fontSize: "11px", fontWeight: "bold",
        color: "#000000", textAlign: "center", padding: "10px", boxSizing: "border-box",
        pointerEvents: "none", wordBreak: "break-word", lineHeight: "1.2"
      }}>
        {data.label}
      </div>

      {/* Outputs (Bottom, Left, Right) */}
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#000000", zIndex: 10, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ background: "#000000", zIndex: 10, width: 6, height: 6, top: "43px" }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: "#000000", zIndex: 10, width: 6, height: 6, top: "43px" }} />
    </div>
  );
};

// ─── Oval Node (Terminal Step) ──────────────────────────────────────────────────
const OvalNode = ({ data, selected }) => {
  const hasOutput = data._hasOutput;

  return (
    <div style={{
      width: "120px",
      height: "44px",
      border: "1.5px solid #000000",
      borderRadius: "24px",
      backgroundColor: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      fontWeight: "bold",
      color: "#000000",
      textAlign: "center",
      padding: "6px 12px",
      boxSizing: "border-box",
      ...nodeBase(selected)
    }}>
      <Handle type="target" position={Position.Top} id="top" style={{ background: "#000000", width: 6, height: 6 }} />
      <Handle type="target" position={Position.Left} id="left-target" style={{ background: "#000000", width: 6, height: 6, top: "50%" }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ background: "#000000", width: 6, height: 6, top: "50%" }} />
      
      <div style={{ wordBreak: "break-word", lineHeight: "1.3" }}>{data.label}</div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          top: "50%",
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: hasOutput ? "#ef4444" : "#000000",
          width: 6,
          height: 6,
          top: "50%",
          opacity: hasOutput ? 0.3 : 1
        }}
        isConnectable={!hasOutput}
      />
    </div>
  );
};

const nodeTypes = { task: TaskNode, decision: DiamondNode, terminal: OvalNode };

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
    borderRadius: 0 // Sharp corners like hand-drawn diagram
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: "#000000", strokeWidth: 1.5 }} />
      {label !== undefined && (
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
                  fontFamily: "Arial, sans-serif"
                }}
              />
            ) : (
              (labelText || data?.fromDecision) && (
                <div
                  style={{
                    padding: "1px 5px",
                    fontSize: "9px",
                    fontWeight: "bold",
                    backgroundColor: "#ffffff",
                    border: "1px solid #000000",
                    color: "#000000",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    fontFamily: "Arial, sans-serif"
                  }}
                  title="Double-click để sửa nhãn"
                >
                  {labelText || (data?.fromDecision ? "Yes/No" : "")}
                </div>
              )
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
    icon: <div style={{ width: 44, height: 24, border: "1.5px solid #000000", backgroundColor: "#ffffff" }} />
  },
  {
    type: "decision", label: "Quyết Định",
    icon: <svg width={36} height={36}><polygon points="18,2 34,18 18,34 2,18" fill="#ffffff" stroke="#000000" strokeWidth="1.5" /></svg>
  },
  {
    type: "terminal", label: "Oval",
    icon: <div style={{ width: 44, height: 24, border: "1.5px solid #000000", borderRadius: 12, backgroundColor: "#ffffff" }} />
  },
];

const ShapePalette = () => {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ width: "94px", flexShrink: 0, backgroundColor: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "16px 4px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
      <div style={{ fontSize: "9px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hình Khối</div>
      
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
            backgroundColor: hovered === item.type ? "#f8fafc" : "transparent",
            borderRadius: "6px", border: "1px dashed transparent",
            borderColor: hovered === item.type ? "#cbd5e1" : "transparent",
            transition: "all 0.15s ease"
          }}
        >
          {item.icon}
          <span style={{ fontSize: "9px", fontWeight: "bold", color: "#334155", textAlign: "center" }}>{item.label}</span>
        </div>
      ))}
      
      <div style={{ borderTop: "1px solid #f1f5f9", width: "80%", marginTop: "8px", paddingTop: "8px", textAlign: "center" }}>
        <span style={{ fontSize: "8px", color: "#94a3b8" }}>Kéo thả vào canvas</span>
      </div>
    </div>
  );
};

// ─── Properties Panel ──────────────────────────────────────────────────────────
const PropertiesPanel = ({ step, stepIndex, onUpdate, onDelete, onClose }) => {
  if (!step) return null;

  return (
    <div style={{ width: "240px", flexShrink: 0, backgroundColor: "#ffffff", borderLeft: "1px solid #cbd5e1", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
          Sửa tên khối
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#94a3b8" }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Tên hiển thị:
          </label>
          <input
            value={step.name || ""}
            onChange={(e) => onUpdate(stepIndex, "name", e.target.value)}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", fontFamily: "Arial, sans-serif" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "9px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Loại hình khối:
          </label>
          <select
            value={step.node_type || "task"}
            onChange={(e) => onUpdate(stepIndex, "node_type", e.target.value)}
            style={{ width: "100%", padding: "5px 6px", border: "1px solid #cbd5e1", fontSize: "11px", backgroundColor: "white", outline: "none" }}
          >
            <option value="task">▭ Bước Xử Lý</option>
            <option value="decision">◇ Quyết Định (Yes/No)</option>
            <option value="terminal">⬭ Oval (Bắt đầu/Kết thúc)</option>
          </select>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #cbd5e1" }}>
        <button
          onClick={() => { onDelete(stepIndex); onClose(); }}
          style={{ width: "100%", padding: "6px", backgroundColor: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
        >
          Xóa khối này
        </button>
      </div>
    </div>
  );
};

// ─── Flowchart Canvas Component ─────────────────────────────────────────────────
const FlowCanvas = ({ steps, onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect, selectedStepNumber, setSelectedStepNumber, canvasRef }) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const edgeLabelMapRef = useRef({});

  useImperativeHandle(canvasRef, () => ({
    triggerAutoLayout: () => {
      handleAutoLayout();
    }
  }));

  // Helper to calculate dimensions based on node type
  const getNodeDimensions = (nodeType) => {
    if (nodeType === "decision") return { width: 86, height: 86 };
    if (nodeType === "terminal") return { width: 120, height: 44 };
    return { width: 140, height: 54 }; // task
  };

  // Helper to calculate center coordinates for a step
  const getStepCenter = useCallback((step) => {
    const x = step.x_pos !== undefined ? step.x_pos : 200;
    const y = step.y_pos !== undefined ? step.y_pos : 100;
    const { width, height } = getNodeDimensions(step.node_type);
    return { x: x + width / 2, y: y + height / 2 };
  }, []);

  // Helper to select best handles between two steps
  const getBestHandles = useCallback((srcStep, tgtStep) => {
    if (!srcStep || !tgtStep) return { sourceHandle: "bottom", targetHandle: "top" };
    const srcCent = getStepCenter(srcStep);
    const tgtCent = getStepCenter(tgtStep);
    
    const dx = tgtCent.x - srcCent.x;
    const dy = tgtCent.y - srcCent.y;

    // If target is above source (loop back)
    if (dy < -20) {
      return { sourceHandle: "left", targetHandle: "left-target" };
    }

    // If target is significantly to the left
    if (dx < -40) {
      return { sourceHandle: "left", targetHandle: "right-target" };
    }

    // If target is significantly to the right
    if (dx > 40) {
      return { sourceHandle: "right", targetHandle: "left-target" };
    }

    // Vertically aligned
    return { sourceHandle: "bottom", targetHandle: "top" };
  }, [getStepCenter]);

  // ─── Build Graph ─────────────────────────────────────────────────────────────
  const buildGraph = useCallback((currentEdgeLabels) => {
    const nodes = [];
    const edges = [];
    const sourceOutputCount = {};

    // 1. Calculate edge connections
    steps.forEach((step, idx) => {
      const stepId = `step-${step.step_number}`;
      if (!sourceOutputCount[stepId]) sourceOutputCount[stepId] = 0;

      // Regular next step connection
      const nextStepNum = step.transition?.next_step;
      if (nextStepNum) {
        sourceOutputCount[stepId]++;
      }

      // Decision branch connections
      if (step.node_type === "decision" && step.has_branch === true) {
        const fp = step.fail_path || [];
        sourceOutputCount[stepId] += fp.length;
      }
    });

    // 2. Build Nodes
    steps.forEach((step, idx) => {
      const stepId = `step-${step.step_number}`;
      const isDecision = step.node_type === "decision";
      const isTerminal = step.node_type === "terminal";
      let nodeType = step.node_type || "task";
      
      const xPos = step.x_pos !== undefined ? step.x_pos : 200;
      const yPos = step.y_pos !== undefined ? step.y_pos : 60 + idx * 110;

      nodes.push({
        id: stepId,
        type: nodeType,
        position: { x: xPos, y: yPos },
        data: {
          label: step.name || `Bước ${step.step_number}`,
          stepNumber: step.step_number,
          _hasOutput: (sourceOutputCount[stepId] || 0) > 0,
        },
        draggable: true,
      });

      // 3. Build Edges (transitions)
      const next = step.transition?.next_step;
      if (next) {
        const nextStep = steps.find(s => s.step_number === next);
        const { sourceHandle, targetHandle } = getBestHandles(step, nextStep);
        const edgeId = `e-${step.step_number}-${next}`;
        const savedLabel = currentEdgeLabels[edgeId] || (isDecision ? "Đúng" : "");
        
        edges.push({
          id: edgeId,
          source: stepId,
          sourceHandle: sourceHandle,
          target: `step-${next}`,
          targetHandle: targetHandle,
          type: "minimal",
          data: {
            fromDecision: isDecision,
            onLabelChange: null, // Set later
          },
          label: savedLabel,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
        });
      }

      // 4. Build Decision Fail branch Edges
      if (isDecision && step.has_branch === true) {
        const fp = step.fail_path || [];
        fp.forEach((pn, pi) => {
          if (pn.return_to_step) {
            const nextStep = steps.find(s => s.step_number === pn.return_to_step);
            const { sourceHandle, targetHandle } = getBestHandles(step, nextStep);
            const edgeId = `e-fail-${step.step_number}-${pn.return_to_step}`;
            const savedLabel = currentEdgeLabels[edgeId] || pn.edge_label || "Sai";
            
            edges.push({
              id: edgeId,
              source: stepId,
              sourceHandle: sourceHandle,
              target: `step-${pn.return_to_step}`,
              targetHandle: targetHandle,
              type: "minimal",
              data: {
                fromDecision: true,
                onLabelChange: null,
              },
              label: savedLabel,
              markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
            });
          }
        });
      }
    });

    return { nodes, edges };
  }, [steps, getBestHandles]);

  const { nodes: iN, edges: iE } = useMemo(() => buildGraph(edgeLabelMapRef.current), [buildGraph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(iN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(iE);

  // Label editing handler
  const handleEdgeLabelChange = useCallback((edgeId, newLabel) => {
    edgeLabelMapRef.current[edgeId] = newLabel;
    
    // Also sync label back to fail_path list if it's a decision fail edge
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

  // Sync state
  const stepsKey = steps.map(s => `${s.step_number}|${s.node_type}|${s.name}|${s.x_pos}|${s.y_pos}|${JSON.stringify(s.transition || {})}|${JSON.stringify(s.fail_path || [])}`).join(";");
  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(edgeLabelMapRef.current);
    const edgesWithHandler = e.map(edge => ({
      ...edge,
      data: { ...edge.data, onLabelChange: handleEdgeLabelChange }
    }));
    setNodes(n);
    setEdges(edgesWithHandler);
  }, [stepsKey]);

  // ─── Connection Validation (Rules) ──────────────────────────────────────────
  const isValidConnection = useCallback((connection) => {
    if (connection.source === connection.target) return false;
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    if (!sourceNode) return false;

    // Rectangle (Task) and Oval (Terminal) -> Exactly 1 output allowed
    if (sourceNode.type === "task" || sourceNode.type === "terminal") {
      const existing = edges.filter(e => e.source === connection.source);
      if (existing.length >= 1) return false;
    }

    return true;
  }, [nodes, edges]);

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

  const onPaneClick = useCallback(() => setSelectedStepNumber(null), [setSelectedStepNumber]);

  // Connect handler
  const onConnect = useCallback((conn) => {
    const sourceStepNum = parseInt(conn.source.replace("step-", ""));
    const targetStepNum = parseInt(conn.target.replace("step-", ""));
    const sourceStepIdx = steps.findIndex(s => s.step_number === sourceStepNum);
    const sourceStep = steps[sourceStepIdx];

    if (!sourceStep) return;

    // Save connection into state
    if (sourceStep.node_type === "decision") {
      // If it's a decision node and we connected to a target:
      // If it's the bottom handle, set the Yes path (transition.next_step).
      // Otherwise, set a No/Fail path branch.
      if (conn.sourceHandle === "bottom") {
        onUpdateStep(sourceStepIdx, "transition", { ...(sourceStep.transition || {}), next_step: targetStepNum });
      } else {
        const fp = sourceStep.fail_path || [];
        const isRight = conn.sourceHandle === "right";
        const label = isRight ? "Sai" : "Không đạt";
        
        // Append or update fail path branch
        const updatedFp = [...fp, { name: "Xử lý lỗi", assignee_role: sourceStep.assignee_role || "QC", edge_label: label, return_to_step: targetStepNum }];
        onUpdateStep(sourceStepIdx, "fail_path", updatedFp);
        onUpdateStep(sourceStepIdx, "has_branch", true);
      }
    } else {
      // Normal node: update transition next step
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

  const handleAutoLayout = useCallback(() => {
    // 1. Get unique roles in order of appearance
    const uniqueRoles = [];
    (steps || []).forEach(s => {
      const role = s.assignee_role || "";
      if (role && !uniqueRoles.includes(role)) {
        uniqueRoles.push(role);
      }
    });
    // If no roles are defined, default to a single empty string role
    if (uniqueRoles.length === 0) {
      uniqueRoles.push("");
    }

    // 2. Identify sidesteps (fail paths)
    const getSidesteps = () => {
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

    const sidesteps = getSidesteps();
    const mainSteps = steps.filter(s => !sidesteps.has(s.step_number));
    const positions = {};

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
          const sideCenter = colCenter - 180; // place to the left of the parent column
          
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

    // 5. Update ReactFlow nodes state and parent coordinates state
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
  }, [nodes, steps, onPositionsChange, fitView, setNodes]);

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
        <Background color="#f1f5f9" gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

// ─── Flowchart Canvas Inner Wrapper ──────────────────────────────────────────────
const FlowchartCanvasInner = ({ steps, onPositionsChange, onAddStep, onUpdateStep, onDeleteStep, onNodeSelect, selectedStepIdx, canvasRef }) => {
  const selectedStepNumber = selectedStepIdx !== -1 && steps[selectedStepIdx] ? steps[selectedStepIdx].step_number : null;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: "#ffffff" }}>
      <ShapePalette />
      <FlowCanvas
        steps={steps}
        onPositionsChange={onPositionsChange}
        onAddStep={onAddStep}
        onUpdateStep={onUpdateStep}
        onDeleteStep={onDeleteStep}
        onNodeSelect={onNodeSelect}
        selectedStepNumber={selectedStepNumber}
        setSelectedStepNumber={() => {}}
        canvasRef={canvasRef}
      />
    </div>
  );
};

// ─── Main Exportable FlowchartCanvas ─────────────────────────────────────────────
const FlowchartCanvas = forwardRef((props, ref) => (
  <div style={{ width: "100%", height: "640px", border: "1px solid #000000", boxSizing: "border-box" }}>
    <ReactFlowProvider>
      <FlowchartCanvasInner {...props} canvasRef={ref} />
    </ReactFlowProvider>
  </div>
));

export default FlowchartCanvas;
