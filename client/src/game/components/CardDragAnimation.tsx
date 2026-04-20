/**
 * CardDragAnimation Component
 * 
 * This component creates smooth CCG-style card dragging animations.
 * It's responsible for:
 * 1. Handling pointer events for card drag and drop
 * 2. Visual feedback during dragging (scale, rotation, etc.)
 * 3. Smooth animation to target locations or back to original position
 * 
 * IMPORTANT: This component uses its own internal wrapper div for all drag transforms
 * to avoid mutating the parent's cardRef transforms (which may have fan layout styles).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CardInstance } from '../types';
import { playSound } from '../utils/soundUtils';
import CardPlacementEffect from './CardPlacementEffect';
import { debug } from '../config/debugConfig';

interface Position {
  x: number;
  y: number;
  insertionIndex?: number;
}

const OUTER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  touchAction: 'none',
};
const INNER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  transformStyle: 'preserve-3d',
  perspective: '1000px',
};

interface CardDragAnimationProps {
  cardRef: React.RefObject<HTMLDivElement>;
  card: CardInstance;
  isPlayable: boolean;
  onDragStart?: () => void;
  onDragEnd?: (wasDropped: boolean, position: Position) => void;
  onValidDrop?: (position: Position) => void;
  boardRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  disabled?: boolean;
  onHoverChange?: (isHovering: boolean) => void;
  onClick?: () => void;
}

export const CardDragAnimation: React.FC<CardDragAnimationProps> = ({
  cardRef,
  card,
  isPlayable,
  onDragStart,
  onDragEnd,
  onValidDrop,
  boardRef,
  children,
  disabled = false,
  onHoverChange,
  onClick
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPlacementEffect, setShowPlacementEffect] = useState(false);
  const [placementEffectPosition, setPlacementEffectPosition] = useState<Position | null>(null);

  const dragWrapperRef = useRef<HTMLDivElement>(null);

  const pointerDown = useRef(false);
  
  const startPosRef = useRef<Position | null>(null);
  const currentPosRef = useRef<Position | null>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  
  const animationRef = useRef<number | null>(null);
  const activeDragListenersRef = useRef<{ move: ((e: PointerEvent) => void) | null; up: ((e: PointerEvent) => void) | null }>({ move: null, up: null });

  const lastPointerPos = useRef<Position | null>(null);
  const lastPointerEventTime = useRef<number | null>(null);
  const pointerVelocity = useRef<Position | null>(null);

  useEffect(() => {
    return () => {
      const { move, up } = activeDragListenersRef.current;
      if (move) document.removeEventListener('pointermove', move);
      if (up) document.removeEventListener('pointerup', up);
      activeDragListenersRef.current = { move: null, up: null };
    };
  }, []);

  const animateToPosition = useCallback((targetX: number, targetY: number, scale = 1, rotate = 0, duration = 400) => {
    if (!dragWrapperRef.current || !startPosRef.current) return;
    
    const startTime = performance.now();
    const wrapper = dragWrapperRef.current;
    const startX = parseFloat(wrapper.style.transform.match(/translate\(([^,]+)/)?.[1] || '0');
    const startY = parseFloat(wrapper.style.transform.match(/translate\([^,]+,\s*([^)]+)/)?.[1] || '0');
    const startScale = parseFloat(wrapper.style.transform.match(/scale\(([^)]+)/)?.[1] || '1');
    const startRotate = parseFloat(wrapper.style.transform.match(/rotate\(([^)]+)/)?.[1] || '0');
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const cubicEaseOut = 1 - Math.pow(1 - progress, 3);
      
      const bounceFactor = scale === 1 ? 0.15 : 0.03;
      const bounceFrequency = scale === 1 ? 2.5 : 1.5;
      
      const elasticBounce = progress === 1 ? 1 : 
        1 - (Math.cos(progress * Math.PI * bounceFrequency) * bounceFactor * Math.pow(1 - progress, 1.5));
        
      const elasticWeight = scale === 1 ? 0.3 : 0.1;
      const easeOut = (1 - elasticWeight) * cubicEaseOut + elasticWeight * elasticBounce;
      
      const currentX = startX + (targetX - startX) * easeOut;
      const currentY = startY + (targetY - startY) * easeOut;
      const currentScale = startScale + (scale - startScale) * easeOut;
      const currentRotate = startRotate + (rotate - startRotate) * easeOut;
      
      if (dragWrapperRef.current) {
        dragWrapperRef.current.style.transform = `
          translate(${currentX}px, ${currentY}px)
          scale(${currentScale})
          rotate(${currentRotate}deg)
        `;

        if (scale === 1) {
          const shadowOpacity = 0.4 * (1 - easeOut);
          dragWrapperRef.current.style.boxShadow = `0 ${5 * (1 - easeOut)}px ${10 * (1 - easeOut)}px rgba(0, 0, 0, ${shadowOpacity})`;
        }
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (scale === 1) {
          if (dragWrapperRef.current) {
            dragWrapperRef.current.style.transform = '';
            dragWrapperRef.current.style.boxShadow = '';
            dragWrapperRef.current.style.zIndex = '';
          }
          if (cardRef.current) {
            cardRef.current.style.cursor = isPlayable ? 'grab' : 'default';
            cardRef.current.classList.remove('card-dragging');
          }
        }
        
        animationRef.current = null;
        isDraggingRef.current = false;
        setIsDragging(false);
        currentPosRef.current = null;
      }
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [cardRef, isPlayable]);

  const createFallingAnimation = useCallback((targetX: number, targetY: number) => {
    if (!dragWrapperRef.current || !startPosRef.current) return;
    
    const startTime = performance.now();
    const duration = 500;
    
    const wrapper = dragWrapperRef.current;
    const currentTransform = wrapper.style.transform;
    const startX = parseFloat(currentTransform.match(/translate3d\(([^,]+)/)?.[1] || '0');
    const startY = parseFloat(currentTransform.match(/translate3d\([^,]+,\s*([^,]+)/)?.[1] || '0');
    const startScale = parseFloat(currentTransform.match(/scale\(([^)]+)/)?.[1] || '1.15');
    
    const fallAngle = (Math.random() - 0.5) * 30;
    
    const initialVelocity = { 
      x: (Math.random() - 0.5) * 3, 
      y: -4
    };
    const gravity = 0.5;
    
    let velocity = { ...initialVelocity };
    let position = { x: startX, y: startY };
    let rotation = 0;
    
    const animate = (time: number) => {
      const elapsed = time - startTime;
      
      velocity.y += gravity;
      position.x += velocity.x;
      position.y += velocity.y;
      rotation += velocity.x * 2;
      
      const progress = Math.min(elapsed / duration, 1);
      const scale = startScale * (1 - progress * 0.2);
      
      if (dragWrapperRef.current) {
        dragWrapperRef.current.style.transform = `
          translate3d(${position.x}px, ${position.y}px, 0)
          scale(${scale})
          rotate(${rotation}deg)
        `;
        dragWrapperRef.current.style.opacity = (1 - progress * 0.8).toString();
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        isDraggingRef.current = false;
        setIsDragging(false);
        currentPosRef.current = null;
        window.dispatchEvent(new Event('card-drag-end'));
      }
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const isValidDrop = useCallback(() => {
    debug.drag("🧪 isValidDrop DEBUG:", {
      boardRefExists: !!boardRef.current,
      boardRefRect: boardRef.current?.getBoundingClientRect(),
      currentPosRefValue: currentPosRef.current,
      dragWrapperRefExists: !!dragWrapperRef.current,
      dragWrapperRect: dragWrapperRef.current?.getBoundingClientRect()
    });

    if (!dragWrapperRef.current || !currentPosRef.current) {
      debug.drag("🧪 isValidDrop: FAILED - missing dragWrapperRef.current or currentPosRef.current");
      return false;
    }
    
    if (!boardRef.current) {
      debug.drag("🧪 isValidDrop: FAILED - boardRef.current is null");
      return false;
    }
    
    const boardElement = boardRef.current;
    const boardRect = boardElement.getBoundingClientRect();
    const wrapperRect = dragWrapperRef.current.getBoundingClientRect();
    
    if (!wrapperRect) {
      debug.drag("🧪 isValidDrop: FAILED - wrapperRect is null");
      return false;
    }
    
    const cardCenterX = wrapperRect.left + wrapperRect.width / 2;
    const cardCenterY = wrapperRect.top + wrapperRect.height / 2;
    
    const tolerance = boardRect.height * 0.1;
    
    const isWithinBounds = (
      cardCenterX >= boardRect.left - tolerance &&
      cardCenterX <= boardRect.right + tolerance &&
      cardCenterY >= boardRect.top - tolerance &&
      cardCenterY <= boardRect.bottom + tolerance
    );
    
    debug.drag(`🧪 isValidDrop: ${isWithinBounds ? 'VALID DROP' : 'INVALID DROP'}`, {
      cardCenter: { x: cardCenterX, y: cardCenterY },
      boardBounds: { left: boardRect.left, right: boardRect.right, top: boardRect.top, bottom: boardRect.bottom },
      tolerance
    });
    
    return isWithinBounds;
  }, [boardRef]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerDown.current || !startPosRef.current) return;
    
    const x = e.clientX - dragOffsetRef.current.x;
    const y = e.clientY - dragOffsetRef.current.y;
    
    const distanceMoved = Math.sqrt(
      Math.pow(x - startPosRef.current.x, 2) + Math.pow(y - startPosRef.current.y, 2)
    );
    
    const dragThreshold = 5; 
    
    if (!isDraggingRef.current && distanceMoved >= dragThreshold) {
      isDraggingRef.current = true;
      setIsDragging(true);
      currentPosRef.current = { x, y };
      window.dispatchEvent(new Event('card-drag-start'));
      playSound('card_hover');
    } else if (isDraggingRef.current) {
      currentPosRef.current = { x, y };
    }
    
    const rotationFactor = 0.08;
    const wrapperRect = dragWrapperRef.current?.getBoundingClientRect();
    const cardCenterX = wrapperRect ? wrapperRect.left + wrapperRect.width / 2 : startPosRef.current.x + dragOffsetRef.current.x;
    
    const cursorOffsetFromCenter = e.clientX - cardCenterX;
    const rotation = -cursorOffsetFromCenter * rotationFactor;
    
    const dampedRotation = Math.sign(rotation) * Math.pow(Math.abs(rotation), 0.85);
    
    const maxRotation = 8;
    const clampedRotation = Math.max(-maxRotation, Math.min(maxRotation, dampedRotation));
    
    const distanceDragged = Math.sqrt(
      Math.pow(x - startPosRef.current.x, 2) + Math.pow(y - startPosRef.current.y, 2)
    );
    const maxLift = 20;
    const lift = Math.min(maxLift, distanceDragged * 0.2);
    
    const now = performance.now();
    const timeDelta = now - (lastPointerEventTime.current || now);
    lastPointerEventTime.current = now;
    
    if (timeDelta > 0 && timeDelta < 100) {
      const lastX = lastPointerPos.current?.x || x;
      const lastY = lastPointerPos.current?.y || y;
      
      pointerVelocity.current = {
        x: (x - lastX) / timeDelta * 16,
        y: (y - lastY) / timeDelta * 16
      };
    }
    
    lastPointerPos.current = { x, y };
    
    if (dragWrapperRef.current && startPosRef.current) {
      const velocityMagnitude = pointerVelocity.current 
        ? Math.sqrt(pointerVelocity.current.x ** 2 + pointerVelocity.current.y ** 2)
        : 0;
      
      const velocityTiltX = pointerVelocity.current ? -pointerVelocity.current.y * 0.2 : 0;
      const velocityTiltY = pointerVelocity.current ? pointerVelocity.current.x * 0.2 : 0;
      
      const maxVelocityTilt = 10;
      const clampedVelocityTiltX = Math.max(-maxVelocityTilt, Math.min(maxVelocityTilt, velocityTiltX));
      const clampedVelocityTiltY = Math.max(-maxVelocityTilt, Math.min(maxVelocityTilt, velocityTiltY));
      
      const dampedVelocityTiltX = clampedVelocityTiltX * 0.8;
      const dampedVelocityTiltY = clampedVelocityTiltY * 0.8;
      
      dragWrapperRef.current.style.transform = `
        translate3d(${x - startPosRef.current.x}px, ${y - startPosRef.current.y - lift}px, ${lift * 1.5}px)
        scale(1.15)
        rotate(${clampedRotation}deg)
        rotateX(${dampedVelocityTiltX}deg)
        rotateY(${-dampedVelocityTiltY}deg)
      `;
      
      dragWrapperRef.current.style.boxShadow = 'none';
    }
    
    if (cardRef.current) {
      cardRef.current.style.cursor = 'grabbing';
    }
    document.body.style.cursor = 'grabbing';
  }, [cardRef]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!pointerDown.current) return;
    
    pointerDown.current = false;
    
    debug.drag("🧪 handlePointerUp DEBUG:", {
      isDraggingRef: isDraggingRef.current,
      currentPosRef: currentPosRef.current,
      startPosRef: startPosRef.current,
      boardRefExists: !!boardRef.current,
      boardRefRect: boardRef.current?.getBoundingClientRect(),
      dragWrapperRefExists: !!dragWrapperRef.current,
      dragWrapperRect: dragWrapperRef.current?.getBoundingClientRect()
    });
    
    if (cardRef.current) {
      cardRef.current.style.cursor = isPlayable ? 'grab' : 'default';
    }
    document.body.style.cursor = '';
    
    const battlefieldElements = document.querySelectorAll('.battlefield-area, .battlefield-container, .player-battlefield-zone, .opponent-battlefield-zone');
    battlefieldElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.cursor = 'default';
      }
    });
    
    if (isDraggingRef.current && currentPosRef.current) {
      const isValid = isValidDrop();
      
      debug.drag("🧪 handlePointerUp: Drop validation result:", isValid);
      
      if (isValid && onValidDrop) {
        playSound('card_place');
        setShowPlacementEffect(true);
        setPlacementEffectPosition(currentPosRef.current);

        // Calculate insertion index from drop X position relative to occupied slots
        let insertionIndex = 0;
        const playerRow = boardRef.current?.closest('.simple-battlefield')?.querySelector('.player-row');
        if (playerRow) {
          const occupiedSlots = playerRow.querySelectorAll('.bf-slot.occupied');
          const dropX = dragWrapperRef.current
            ? dragWrapperRef.current.getBoundingClientRect().left + dragWrapperRef.current.getBoundingClientRect().width / 2
            : currentPosRef.current.x;
          const centers: number[] = [];
          occupiedSlots.forEach(slot => {
            const rect = slot.getBoundingClientRect();
            centers.push(rect.left + rect.width / 2);
          });
          insertionIndex = centers.length;
          for (let i = 0; i < centers.length; i++) {
            if (dropX < centers[i]) {
              insertionIndex = i;
              break;
            }
          }
        }

        const dropPosition = { ...currentPosRef.current, insertionIndex };
        onValidDrop(dropPosition);
        if (onDragEnd) onDragEnd(true, dropPosition);
      } else {
        playSound('card_return');
        if (startPosRef.current) {
          animateToPosition(0, 0, 1, 0);
        }
        if (onDragEnd) onDragEnd(false, currentPosRef.current);
      }
    } else {
      debug.drag("🧪 handlePointerUp: Not dragging — treating as click");
      if (dragWrapperRef.current) {
        dragWrapperRef.current.style.transform = '';
      }
      if (cardRef.current) {
        cardRef.current.classList.remove('card-dragging');
      }
      if (onClick) {
        onClick();
      }
    }
    
    isDraggingRef.current = false;
    setIsDragging(false);
    window.dispatchEvent(new Event('card-drag-end'));
  }, [animateToPosition, boardRef, cardRef, isPlayable, isValidDrop, onClick, onDragEnd, onValidDrop]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    debug.drag("🎮 CardDragAnimation: PointerDown event received", { disabled, isPlayable, card: card?.card?.name });
    
    if (disabled || !isPlayable) {
      debug.drag("🔒 CardDragAnimation: Drag disabled", { disabled, isPlayable });
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    const isRightClick = e.button === 2;
    
    const target = e.target as HTMLElement;
    debug.drag("🔍 Click detected on element:", {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      closest_card: target.closest('[class*="card"]')?.className,
      data_attributes: Array.from(target.attributes).filter(attr => attr.name.startsWith('data-'))
    });
    
    const isWithinCardWrapper = target.closest('[data-card-draggable="true"]') || 
                               dragWrapperRef.current?.contains(target);
    
    if (!isWithinCardWrapper) {
      debug.drag("❌ Click outside card drag area");
      return;
    }
    
    debug.drag("✅ Drag initiated from valid card area");
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    dragOffsetRef.current = { x: offsetX, y: offsetY };
    
    startPosRef.current = { x: rect.left, y: rect.top };
    
    pointerDown.current = true;
    
    if (cardRef.current) {
      try {
        cardRef.current.setPointerCapture(e.pointerId);
        
        const handlePointerMoveEvent = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId === e.pointerId) {
            moveEvent.stopPropagation();
            handlePointerMove(moveEvent);
          }
        };
        
        const handlePointerUpEvent = (upEvent: PointerEvent) => {
          if (upEvent.pointerId === e.pointerId) {
            upEvent.stopPropagation();
            
            document.removeEventListener('pointermove', handlePointerMoveEvent);
            document.removeEventListener('pointerup', handlePointerUpEvent);
            activeDragListenersRef.current = { move: null, up: null };

            if (cardRef.current) {
              try {
                cardRef.current.releasePointerCapture(e.pointerId);
              } catch (err) {
              }
            }
            
            handlePointerUp(upEvent);
          }
        };
        
        activeDragListenersRef.current = { move: handlePointerMoveEvent, up: handlePointerUpEvent };
        document.addEventListener('pointermove', handlePointerMoveEvent);
        document.addEventListener('pointerup', handlePointerUpEvent);
      } catch (err) {
        debug.drag("Pointer capture error:", err);
      }
      
      cardRef.current.style.cursor = 'grabbing';
      cardRef.current.classList.add('card-dragging');
    }
    document.body.style.cursor = 'grabbing';
    
    if (dragWrapperRef.current) {
      dragWrapperRef.current.style.zIndex = '2000';
      dragWrapperRef.current.style.transition = 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1.2), box-shadow 0.15s ease-out'; 
      dragWrapperRef.current.style.transform = `scale(1.2) translateY(-10px)`;
      dragWrapperRef.current.style.boxShadow = 'none';
      
      setTimeout(() => {
        if (dragWrapperRef.current) dragWrapperRef.current.style.transition = '';
      }, 150);
    }
    
    if (onDragStart) onDragStart();
  }, [cardRef, disabled, handlePointerMove, handlePointerUp, isPlayable, onDragStart]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handlePointerEnter = useCallback(() => {
    if (!isDraggingRef.current && onHoverChange) {
      onHoverChange(true);
    }
  }, [onHoverChange]);

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current && onHoverChange) {
      onHoverChange(false);
    }
  }, [onHoverChange]);

  return (
    <div
      data-card-draggable="true"
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={OUTER_STYLE}
    >
      <div
        ref={dragWrapperRef}
        style={INNER_STYLE}
      >
        {children}
      </div>
      
      {showPlacementEffect && placementEffectPosition && (
        <CardPlacementEffect
          x={placementEffectPosition.x}
          y={placementEffectPosition.y}
          onComplete={() => setShowPlacementEffect(false)}
        />
      )}
    </div>
  );
};

export default CardDragAnimation;
