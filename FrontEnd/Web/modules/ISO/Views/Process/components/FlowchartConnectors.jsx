import React from 'react';

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

export { FlowchartConnectors, renderCustomOutcomeNode };
