/**
 * AttackIndicator.tsx
 * 
 * This component draws an arrow between the attacking card and its target
 * to visually indicate an attack in progress.
 */

import React, { useEffect, useRef } from 'react';
import { Position } from '../types/Position';
import './AttackStyles.css';

interface AttackIndicatorProps {
  fromPosition: Position;
  toPosition: Position;
  isActive: boolean;
}

const AttackIndicator: React.FC<AttackIndicatorProps> = ({ 
  fromPosition, 
  toPosition, 
  isActive 
}) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !lineRef.current || !arrowRef.current) return;

    // Calculate the distance and angle between the points
    const dx = toPosition.x - fromPosition.x;
    const dy = toPosition.y - fromPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Set the line length and rotation
    lineRef.current.style.width = `${distance}px`;
    lineRef.current.style.transform = `rotate(${angle}deg)`;
    lineRef.current.style.top = `${fromPosition.y}px`;
    lineRef.current.style.left = `${fromPosition.x}px`;

    // Position the arrow at the end of the line, rotated appropriately
    arrowRef.current.style.top = `${toPosition.y}px`;
    arrowRef.current.style.left = `${toPosition.x}px`;
    // Arrow rotation is 90 degrees offset from the line rotation
    arrowRef.current.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;
  }, [fromPosition, toPosition, isActive]);

  if (!isActive) return null;

  return (
    <>
      <div ref={lineRef} className="attack-line" />
      <div ref={arrowRef} className="attack-arrow" />
    </>
  );
};

export default AttackIndicator;