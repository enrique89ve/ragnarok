import React, { useEffect, useId, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTargetingStore } from '../stores/targetingStore';
import { useTargetingAdapter } from '../hooks';
import './TargetingOverlay.css';
import { GameIcon } from '../utils/ui/GameIcon';
import {
  ARENA_CANVAS_SIZE,
  ARENA_VFX_LAYERS,
  getArenaLocalPoint,
  getArenaVfxLayer,
} from '../combat/arenaVfxTargets';

interface ArrowPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX: number;
  controlY: number;
}

interface ArenaCardPosition {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

function toArenaPoint(
  point: { x: number; y: number },
  layer: HTMLElement,
): { x: number; y: number } | null {
  return getArenaLocalPoint(point, layer);
}

function toArenaCardPosition(
  position: { centerX: number; centerY: number; width: number; height: number },
  layer: HTMLElement,
): ArenaCardPosition | undefined {
  const center = toArenaPoint({ x: position.centerX, y: position.centerY }, layer);
  const rect = layer.getBoundingClientRect();
  if (!center || rect.width <= 0 || rect.height <= 0) return undefined;

  return {
    centerX: center.x,
    centerY: center.y,
    width: position.width * (ARENA_CANVAS_SIZE.width / rect.width),
    height: position.height * (ARENA_CANVAS_SIZE.height / rect.height),
  };
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

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [arrowPath, setArrowPath] = useState<ArrowPath | null>(null);
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `targeting-${idPrefix}-gradient`;
  const glowId = `targeting-${idPrefix}-glow`;
  const markerId = `targeting-${idPrefix}-head`;

  useEffect(() => {
    setPortalTarget(getArenaVfxLayer(ARENA_VFX_LAYERS.vfx));
  }, []);
  
  useEffect(() => {
    if (!isTargeting) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isTargeting]);
  
  useEffect(() => {
    if (!isTargeting || !attackerPosition || !portalTarget) {
      setArrowPath(null);
      return;
    }

    const attackerPoint = toArenaPoint(
      { x: attackerPosition.centerX, y: attackerPosition.centerY },
      portalTarget,
    );
    if (!attackerPoint) {
      setArrowPath(null);
      return;
    }

    const startX = attackerPoint.x;
    const startY = attackerPoint.y;
    
    let endX: number, endY: number;
    
    if (hoveredTargetId && hoveredPosition) {
      const targetPos = cardPositions.get(hoveredTargetId);
      if (targetPos) {
        const targetPoint = toArenaPoint(
          { x: targetPos.centerX, y: targetPos.centerY },
          portalTarget,
        );
        if (!targetPoint) {
          setArrowPath(null);
          return;
        }
        endX = targetPoint.x;
        endY = targetPoint.y;
      } else {
        const targetPoint = toArenaPoint(hoveredPosition, portalTarget);
        if (!targetPoint) {
          setArrowPath(null);
          return;
        }
        endX = targetPoint.x;
        endY = targetPoint.y;
      }
    } else {
      const mousePoint = toArenaPoint(mousePos, portalTarget);
      if (!mousePoint) {
        setArrowPath(null);
        return;
      }
      endX = mousePoint.x;
      endY = mousePoint.y;
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
  }, [isTargeting, attackerPosition, hoveredTargetId, hoveredPosition, mousePos, cardPositions, portalTarget]);

  if (!portalTarget || !isTargeting || !arrowPath) {
    return null;
  }
  
  const pathD = `M ${arrowPath.startX} ${arrowPath.startY} Q ${arrowPath.controlX} ${arrowPath.controlY} ${arrowPath.endX} ${arrowPath.endY}`;
  
  const isValidTarget = hoveredTargetId !== null;
  const isLethal = damagePreview?.isLethalToTarget;
  
  const targetPosition = hoveredTargetId
    ? cardPositions.get(hoveredTargetId)
    : undefined;
  const arenaTargetPosition = targetPosition
    ? toArenaCardPosition(targetPosition, portalTarget)
    : undefined;

  return ReactDOM.createPortal(
    <div className="targeting-overlay" data-vfx-layer={ARENA_VFX_LAYERS.vfx}>
      <svg
        className="targeting-svg"
        viewBox={`0 0 ${ARENA_CANVAS_SIZE.width} ${ARENA_CANVAS_SIZE.height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isLethal ? "#ff4444" : "#ffcc00"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isLethal ? "#ff0000" : "#ff8800"} stopOpacity="1" />
          </linearGradient>

          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <marker
            id={markerId}
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
          stroke={`url(#${gradientId})`}
          strokeWidth="6"
          fill="none"
          filter={`url(#${glowId})`}
          markerEnd={`url(#${markerId})`}
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
          position={arenaTargetPosition}
        />
      )}
    </div>,
    portalTarget,
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
        <span className="damage-icon"><GameIcon name="swords" size={14} /></span>
        <span className="damage-value">-{preview.damageToTarget}</span>
      </div>
      <div className={`health-result ${preview.isLethalToTarget ? 'dead' : ''}`}>
        {preview.isLethalToTarget ? (
          <span className="skull-icon"><GameIcon name="skull" size={14} /></span>
        ) : (
          <span className="health-remaining">{resultingHealth} HP</span>
        )}
      </div>
    </div>
  );
}
