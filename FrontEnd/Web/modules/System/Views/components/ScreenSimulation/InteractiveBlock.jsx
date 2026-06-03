import React from 'react';
import './Simulation.css';

export const InteractiveBlock = ({
  name,
  type = "UI Component",
  description,
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  children
}) => {
  const isActive = activeComponent === name;
  const isHovered = hoveredComponent === name;

  const handleMouseEnter = (e) => {
    e.stopPropagation();
    if (onHover) onHover(name);
  };

  const handleMouseLeave = (e) => {
    e.stopPropagation();
    if (onHover) onHover(null);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick(name);
  };

  return (
    <div
      data-comp-name={name}
      className={`interactive-block-wrapper ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      {/* Badge overlay on hover or active */}
      <div className="block-overlay">
        <span className="block-badge">{name}</span>
      </div>

      {/* Tooltip on hover */}
      {isHovered && (
        <div className="block-tooltip">
          <div className="tooltip-title">{name}</div>
          <div className="tooltip-type">{type}</div>
          {description && <div className="tooltip-desc">{description}</div>}
          <div className="tooltip-hint">Click để xem chi tiết thẻ</div>
        </div>
      )}
    </div>
  );
};

export default InteractiveBlock;
