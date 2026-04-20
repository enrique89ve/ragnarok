import React from 'react';
import { BadgeProps } from './types';

/**
 * HexagonBadge Component
 * 
 * A reusable hexagonal badge component used for displaying card stats (attack, health, etc.)
 * throughout the application. This component ensures consistent styling and behavior across
 * all card implementations.
 */
const HexagonBadge: React.FC<BadgeProps> = ({ 
  value, 
  color, 
  position,
  size = 40,
  style = {}
}) => {
  // Calculate the coordinates for the hexagon shape
  const halfSize = size / 2;
  const h = size; // Height
  const w = size; // Width
  
  // Calculate the points for hexagon
  const points = [
    [w * 0.25, 0],         // Top left
    [w * 0.75, 0],         // Top right
    [w, h * 0.5],          // Middle right
    [w * 0.75, h],         // Bottom right
    [w * 0.25, h],         // Bottom left
    [0, h * 0.5]           // Middle left
  ];
  
  // Convert points to SVG path format
  const pathData = points.map((point, i) => 
    `${i === 0 ? 'M' : 'L'}${point[0]},${point[1]}`
  ).join(' ') + 'Z';
  
  // Add shadow and glow effects
  const shadowFilter = `drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.5))`;
  
  // Create position style object separately to avoid TypeScript error
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '10px', // Default bottom position
    zIndex: 3,
    width: `${size}px`,
    height: `${size}px`,
    filter: shadowFilter,
  };
  
  // Add position-specific style
  if (position === 'left') {
    positionStyle.left = '10px';
  } else if (position === 'right') {
    positionStyle.right = '10px';
  } else if (position === 'top') {
    positionStyle.top = '10px';
    positionStyle.bottom = 'auto';
    if (position === 'top') {
      positionStyle.left = '50%';
      positionStyle.transform = 'translateX(-50%)';
    }
  } else if (position === 'bottom') {
    positionStyle.bottom = '10px';
    positionStyle.left = '50%';
    positionStyle.transform = 'translateX(-50%)';
  }
  
  // Combine all styles
  const badgeStyles = {
    ...positionStyle,
    ...style
  };
  
  return (
    <div style={badgeStyles} className="hexagon-badge">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ 
          filter: `drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.7))`,
        }}
      >
        {/* Outer glow for the hexagon */}
        <defs>
          <filter id={`glow-${position}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Main hexagon shape */}
        <path 
          d={pathData} 
          fill={color} 
          filter={`url(#glow-${position})`}
          stroke="#000"
          strokeWidth="1"
        />
        
        {/* Inner hexagon for depth effect */}
        <path 
          d={pathData} 
          fill="url(#badge-gradient)"
          transform="scale(0.9) translate(2, 2)"
          opacity="0.3"
        />
        
        {/* Gradient for 3D effect */}
        <defs>
          <linearGradient id="badge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="100%" stopColor="black" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* Value text */}
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle"
          fill="white"
          fontWeight="bold"
          fontSize={size / 2}
          filter="drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.8))"
        >
          {value}
        </text>
      </svg>
    </div>
  );
};

// To ensure this component is well-documented 
HexagonBadge.displayName = 'HexagonBadge';

export default HexagonBadge;