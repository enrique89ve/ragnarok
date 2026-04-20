/**
 * TargetingArrow Component
 * 
 * This component draws an animated arrow from a source position to the current mouse position
 * Used when targeting spells and battlecries
 */
import React, { useRef, useEffect } from 'react';
import { Position } from '../types';

interface TargetingArrowProps {
  from: Position;
  to: Position;
  color?: string;
  arrowWidth?: number;
  animated?: boolean;
}

const TargetingArrow: React.FC<TargetingArrowProps> = ({
  from,
  to,
  color = '#ffcc00',
  arrowWidth = 8,
  animated = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas to be fullscreen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the angle between the start and end points
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    
    // Calculate the distance between the points
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    
    // Start drawing the arrow
    ctx.save();
    
    // Set up styles
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = arrowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Glowing effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    
    // Create a gradient for better visual effect
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, '#ffcc00'); // Starting color (more yellow)
    gradient.addColorStop(1, '#ff6600'); // Ending color (more orange)
    ctx.strokeStyle = gradient;
    
    // If the arrow should be animated, draw a dashed line
    if (animated) {
      ctx.setLineDash([15, 5]);
      
      // Create an animation for the dashed line
      const timestamp = Date.now();
      const dashOffset = (timestamp / 150) % 20; // Moving dash
      ctx.lineDashOffset = -dashOffset;
    }
    
    // Draw the main arrow line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    
    // If we should curve the arrow
    if (distance > 100) {
      // Add a slight curve to the arrow
      const curveFactor = 0.2;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      
      // Calculate control point perpendicular to the line
      const controlX = midX - curveFactor * (to.y - from.y);
      const controlY = midY + curveFactor * (to.x - from.x);
      
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
    } else {
      // For short arrows, just draw a straight line
      ctx.lineTo(to.x, to.y);
    }
    
    ctx.stroke();
    
    // Now draw the arrowhead
    // Reset the dash settings
    ctx.setLineDash([]);
    
    const arrowHeadLength = arrowWidth * 4; // Size of the arrowhead
    const arrowHeadWidth = arrowWidth * 2.5;
    
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowHeadLength * Math.cos(angle - Math.PI/6),
      to.y - arrowHeadLength * Math.sin(angle - Math.PI/6)
    );
    ctx.lineTo(
      to.x - arrowHeadLength * 0.5 * Math.cos(angle),
      to.y - arrowHeadLength * 0.5 * Math.sin(angle)
    );
    ctx.lineTo(
      to.x - arrowHeadLength * Math.cos(angle + Math.PI/6),
      to.y - arrowHeadLength * Math.sin(angle + Math.PI/6)
    );
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add a small pulsing circle at the end of the arrow
    if (animated) {
      const timestamp = Date.now();
      const pulseFactor = 0.5 + 0.5 * Math.sin(timestamp / 200); // Pulsing factor
      const circleRadius = arrowWidth * (1 + pulseFactor * 0.5);
      
      ctx.beginPath();
      ctx.arc(to.x, to.y, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      
      // Add a second, larger circle with lower opacity
      ctx.beginPath();
      ctx.arc(to.x, to.y, circleRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 * pulseFactor;
      ctx.fill();
    }
    
    ctx.restore();
  }, [from, to, color, arrowWidth, animated]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Important: allow clicking through
        zIndex: 9998 // High z-index to appear above most elements
      }}
    />
  );
};

export default TargetingArrow;