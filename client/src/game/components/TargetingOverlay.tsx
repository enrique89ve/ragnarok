import React, { useEffect, useState, useCallback } from 'react';
import { useTargetingStore } from '../stores/targetingStore';
import { useTargetingAdapter } from '../hooks';
import './TargetingOverlay.css';

interface ArrowPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX: number;
  controlY: number;
}

export function TargetingOverlay() {
  const adapter = useTargetingAdapter();
  const legacyStore = useTargetingStore();
  
  const { 
    isTargeting, 
    attackerPosition, 
    hoveredTargetId,
    hoveredPosition,
    cardPositions,
    damagePreview
  } = {
    isTargeting: adapter.isTargeting,
    attackerPosition: legacyStore.attackerPosition,
    hoveredTargetId: adapter.hoveredTargetId,
    hoveredPosition: legacyStore.hoveredPosition,
    cardPositions: legacyStore.cardPositions,
    damagePreview: legacyStore.damagePreview
  };
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [arrowPath, setArrowPath] = useState<ArrowPath | null>(null);
  
  useEffect(() => {
    if (!isTargeting) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTargeting]);
  
  useEffect(() => {
    if (!isTargeting || !attackerPosition) {
      setArrowPath(null);
      return;
    }
    
    const startX = attackerPosition.centerX;
    const startY = attackerPosition.centerY;
    
    let endX: number, endY: number;
    
    if (hoveredTargetId && hoveredPosition) {
      const targetPos = cardPositions.get(hoveredTargetId);
      if (targetPos) {
        endX = targetPos.centerX;
        endY = targetPos.centerY;
      } else {
        endX = hoveredPosition.x;
        endY = hoveredPosition.y;
      }
    } else {
      endX = mousePos.x;
      endY = mousePos.y;
    }
    
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 50;
    
    setArrowPath({
      startX,
      startY,
      endX,
      endY,
      controlX: midX,
      controlY: midY
    });
  }, [isTargeting, attackerPosition, hoveredTargetId, hoveredPosition, mousePos, cardPositions]);
  
  if (!isTargeting || !arrowPath) {
    return null;
  }
  
  const pathD = `M ${arrowPath.startX} ${arrowPath.startY} Q ${arrowPath.controlX} ${arrowPath.controlY} ${arrowPath.endX} ${arrowPath.endY}`;
  
  const angle = Math.atan2(
    arrowPath.endY - arrowPath.controlY,
    arrowPath.endX - arrowPath.controlX
  ) * (180 / Math.PI);
  
  const isValidTarget = hoveredTargetId !== null;
  const isLethal = damagePreview?.isLethalToTarget;
  
  return (
    <div className="targeting-overlay">
      <svg className="targeting-svg" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}>
        <defs>
          <linearGradient id="arrow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isLethal ? "#ff4444" : "#ffcc00"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isLethal ? "#ff0000" : "#ff8800"} stopOpacity="1" />
          </linearGradient>
          
          <filter id="arrow-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
          >
            <path
              d="M0,0 L0,12 L12,6 Z"
              fill={isLethal ? "#ff0000" : "#ff8800"}
            />
          </marker>
        </defs>
        
        <path
          d={pathD}
          className={`arrow-path ${isValidTarget ? 'valid-target' : ''} ${isLethal ? 'lethal' : ''}`}
          stroke="url(#arrow-gradient)"
          strokeWidth="6"
          fill="none"
          filter="url(#arrow-glow)"
          markerEnd="url(#arrowhead)"
        />
        
        <circle
          cx={arrowPath.startX}
          cy={arrowPath.startY}
          r="12"
          className="arrow-origin"
        />
      </svg>
      
      {damagePreview && hoveredTargetId && (
        <DamagePreviewBadge 
          preview={damagePreview}
          position={cardPositions.get(hoveredTargetId)}
        />
      )}
    </div>
  );
}

interface DamagePreviewBadgeProps {
  preview: {
    damageToTarget: number;
    damageToAttacker: number;
    isLethalToTarget: boolean;
    isLethalToAttacker: boolean;
    targetCurrentHealth: number;
    attackerCurrentHealth: number;
  };
  position?: { centerX: number; centerY: number; width: number; height: number };
}

function DamagePreviewBadge({ preview, position }: DamagePreviewBadgeProps) {
  if (!position) return null;
  
  const resultingHealth = preview.targetCurrentHealth - preview.damageToTarget;
  
  return (
    <div 
      className={`damage-preview-badge ${preview.isLethalToTarget ? 'lethal' : ''}`}
      style={{
        left: position.centerX,
        top: position.centerY - position.height / 2 - 40
      }}
    >
      <div className="damage-amount">
        <span className="damage-icon">⚔️</span>
        <span className="damage-value">-{preview.damageToTarget}</span>
      </div>
      <div className={`health-result ${preview.isLethalToTarget ? 'dead' : ''}`}>
        {preview.isLethalToTarget ? (
          <span className="skull-icon">💀</span>
        ) : (
          <span className="health-remaining">{resultingHealth} HP</span>
        )}
      </div>
    </div>
  );
}
