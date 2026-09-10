import React from 'react';

/**
 * Mini SVG Sparkline for trend visualization in tables
 */
export const MiniSparkline = ({
  data = [10, 15, 12, 18, 22, 25],
  color = '#DC2626',
  width = 65,
  height = 20
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 3;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * innerWidth;
    const y = height - padding - ((val - min) / range) * innerHeight;
    return `${x},${y}`;
  }).join(' ');

  const lastIndex = data.length - 1;
  const lastX = padding + innerWidth;
  const lastY = height - padding - ((data[lastIndex] - min) / range) * innerHeight;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', verticalAlign: 'middle' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill={color}
      />
    </svg>
  );
};

export default MiniSparkline;
