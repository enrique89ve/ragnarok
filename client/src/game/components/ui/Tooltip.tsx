import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  disabled?: boolean;
  className?: string;
  interactive?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'auto',
  delay = 100,
  disabled = false,
  className = '',
  interactive = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, placement: 'top' as string });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width || 250;
    const tooltipHeight = tooltipRect?.height || 100;
    const padding = 12;
    
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    let placement = position;
    
    if (position === 'auto') {
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      placement = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
    
    switch (placement) {
      case 'top':
        y = rect.top - padding;
        break;
      case 'bottom':
        y = rect.bottom + padding;
        break;
      case 'left':
        x = rect.left - padding;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + padding;
        y = rect.top + rect.height / 2;
        break;
    }
    
    if (x - tooltipWidth / 2 < padding) {
      x = tooltipWidth / 2 + padding;
    } else if (x + tooltipWidth / 2 > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth / 2 - padding;
    }
    
    setCoords({ x, y, placement });
  }, [position]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      requestAnimationFrame(calculatePosition);
    }, delay);
  }, [disabled, delay, calculatePosition]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }
    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipContent = isVisible && content && createPortal(
    <div
      ref={tooltipRef}
      id="portal-tooltip"
      role="tooltip"
      className={`portal-tooltip portal-tooltip--${coords.placement} ${className}`}
      style={{
        left: coords.x,
        top: coords.y,
        transform: coords.placement === 'top' ? 'translate(-50%, -100%)' :
                   coords.placement === 'bottom' ? 'translate(-50%, 0)' :
                   coords.placement === 'left' ? 'translate(-100%, -50%)' :
                   'translate(0, -50%)'
      }}
      onMouseEnter={interactive ? () => setIsVisible(true) : undefined}
      onMouseLeave={interactive ? hideTooltip : undefined}
    >
      {content}
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-block' }}
        aria-describedby={isVisible ? 'portal-tooltip' : undefined}
      >
        {children}
      </div>
      {tooltipContent}
    </>
  );
};

export default Tooltip;
