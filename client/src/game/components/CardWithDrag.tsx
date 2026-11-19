/**
 * Card component with pointer drag support.
 *
 * Renders a card in hand with hover preview and click-to-play.
 */
import { debug } from '../config/debugConfig';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CardInstance } from '../types';
import { Position } from '../types/Position';
import { CardInstanceWithCardData, isCardInstanceWithCardData } from '../types/interfaceExtensions';
import { playSound } from '../utils/soundUtils';
import { ACTIVE_CARD_RENDERER } from '../utils/cards/cardRenderingRegistry';
import { fixCardRenderingIssues } from '../utils/cardRenderingSystemFix';
import { getCardDataSafely } from '../utils/cards/cardInstanceAdapter';
import SimpleCardCompat from './card/SimpleCardCompat';
import { toSimpleCardData } from './card/cardDataAdapter';
import './CardHoverEffects.css';
import {
	computeCardDragDynamics,
	isPointInBattleCommitZone,
	resolveCardMagicCursor,
	toCanvasDragOffset,
} from './cardDragDrop';
import type { CardMagicCursor, DropRect } from './cardDragDrop';

interface CardWithDragProps {
	card: CardInstance | CardInstanceWithCardData;
	isInHand: boolean;
	isPlayable: boolean;
	isHighlighted?: boolean;
	onClick?: () => void;
	onPlay?: (card: CardInstanceWithCardData, position?: Position) => void;
	onDragStart?: () => void;
	onDragEnd?: (wasDropped: boolean, position: Position) => void;
	onValidDrop?: (position: Position) => void;
	boardRef: React.RefObject<HTMLDivElement | null>;
	registerPosition: (card: CardInstance | CardInstanceWithCardData, position: Position) => void;
	className?: string;
	attackBuff?: number;
	healthBuff?: number;
}

const DRAG_START_DISTANCE = 3;

interface PointerStart {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
}

interface CachedDragMetrics {
	readonly arenaScale: Position;
	readonly dropZoneEl: HTMLElement | null;
	readonly dropZoneRect: DropRect | null;
	readonly reducedMotion: boolean;
}

interface DragMotionState {
	targetX: number;
	targetY: number;
	currentX: number;
	currentY: number;
	vx: number;
	vy: number;
	currentScale: number;
	lastFrameTime: number;
	isOverZone: boolean;
}

interface CardDragVisualState {
	readonly className: string;
	readonly magicCursor: CardMagicCursor;
	readonly isPlayable: boolean;
	readonly isHovering: boolean;
	readonly isInHand: boolean;
	readonly canDrag: boolean;
	readonly isPressed: boolean;
	readonly isDragging: boolean;
	readonly isOverDropZone: boolean;
}

function buildCardDragClassName(state: CardDragVisualState): string {
	return [
		'card-with-drag hand-card-flat',
		state.className,
		`magic-cursor--${state.magicCursor}`,
		state.isPlayable ? 'playable' : 'not-playable',
		state.isHovering ? 'is-hovering' : '',
		state.isInHand ? 'in-hand' : '',
		state.canDrag ? 'can-drag' : '',
		state.isPressed ? 'is-pressed' : '',
		state.isDragging ? 'is-dragging' : '',
		state.isOverDropZone ? 'is-valid-drop' : '',
	].filter(Boolean).join(' ');
}

export const CardWithDrag: React.FC<CardWithDragProps> = React.memo(({
	card,
	isInHand,
	isPlayable,
	onClick,
	onPlay,
	onDragStart,
	onDragEnd,
	onValidDrop,
	boardRef,
	className = "",
	attackBuff = 0,
	healthBuff = 0
}) => {
	const cardRef = useRef<HTMLDivElement>(null);
	const shadowRef = useRef<HTMLDivElement>(null);
	const [isHovering, setIsHovering] = useState(false);
	const [isPressed, setIsPressed] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [isOverDropZone, setIsOverDropZone] = useState(false);
	const pointerStartRef = useRef<PointerStart | null>(null);
	const dragStartedRef = useRef(false);
	const releasingCaptureRef = useRef(false);
	const suppressClickRef = useRef(false);
	const metricsRef = useRef<CachedDragMetrics | null>(null);
	const rafIdRef = useRef<number | null>(null);
	const motionRef = useRef<DragMotionState>({
		targetX: 0,
		targetY: 0,
		currentX: 0,
		currentY: 0,
		vx: 0,
		vy: 0,
		currentScale: 1.08,
		lastFrameTime: 0,
		isOverZone: false,
	});

	const clearDropZoneIndicators = useCallback(() => {
		document.documentElement.classList.remove('is-card-drag-ready');
		metricsRef.current?.dropZoneEl?.removeAttribute('data-drag-ready');
	}, []);

	const stopDragLoop = useCallback(() => {
		if (rafIdRef.current !== null) {
			window.cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
	}, []);

	const clearInlineDragStyles = useCallback(() => {
		if (cardRef.current) {
			cardRef.current.style.transform = '';
		}
		if (shadowRef.current) {
			shadowRef.current.style.transform = '';
			shadowRef.current.style.opacity = '';
		}
	}, []);

	useEffect(() => {
		if (!isDragging) return undefined;
		document.documentElement.classList.add('is-card-dragging');
		return () => {
			document.documentElement.classList.remove('is-card-dragging');
			document.documentElement.classList.remove('is-card-drag-ready');
		};
	}, [isDragging]);

	useEffect(() => {
		return () => {
			stopDragLoop();
			clearDropZoneIndicators();
		};
	}, [stopDragLoop, clearDropZoneIndicators]);

	useEffect(() => {
		fixCardRenderingIssues();
		if (cardRef?.current) {
			cardRef.current.setAttribute('data-card-component', 'CardWithDrag');
			cardRef.current.setAttribute('data-active-renderer', ACTIVE_CARD_RENDERER);
		}
	}, []);

	const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		if (suppressClickRef.current) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if (!card || !isPlayable) return;
		if (!onPlay && !onClick) return;
		playSound('card_hover');
		if (onPlay && isCardInstanceWithCardData(card)) {
			event.stopPropagation();
			onPlay(card);
		} else if (onClick) {
			event.stopPropagation();
			onClick();
		}
	}, [onPlay, onClick, isPlayable, card]);

	const captureDragMetrics = useCallback((): CachedDragMetrics => {
		const arena = boardRef.current;
		let arenaScale: Position = { x: 1, y: 1 };
		if (arena) {
			const rect = arena.getBoundingClientRect();
			const scaleX = arena.offsetWidth > 0 ? rect.width / arena.offsetWidth : 1;
			const scaleY = arena.offsetHeight > 0 ? rect.height / arena.offsetHeight : 1;
			arenaScale = {
				x: scaleX > 0 ? scaleX : 1,
				y: scaleY > 0 ? scaleY : 1,
			};
		}
		const dropZoneEl = arena?.querySelector<HTMLElement>('[data-card-drop-zone="battlefield"]') ?? null;
		const dropZoneRect = dropZoneEl?.getBoundingClientRect() ?? null;
		const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;
		return { arenaScale, dropZoneEl, dropZoneRect, reducedMotion };
	}, [boardRef]);

	const startDragLoop = useCallback(() => {
		stopDragLoop();
		motionRef.current.lastFrameTime = performance.now();

		const tick = (now: number) => {
			if (!dragStartedRef.current) {
				rafIdRef.current = null;
				return;
			}
			const m = motionRef.current;
			const metrics = metricsRef.current;
			const dt = Math.min(Math.max((now - m.lastFrameTime) / 1000, 0.001), 0.05);
			m.lastFrameTime = now;

			const prevX = m.currentX;
			const prevY = m.currentY;
			const posAlpha = 1 - Math.exp(-dt * 38);
			m.currentX += (m.targetX - m.currentX) * posAlpha;
			m.currentY += (m.targetY - m.currentY) * posAlpha;

			// Normalize velocity to 60fps-equivalent px/frame for consistent tilt across 60/120/144Hz
			const frameScale = (1 / 60) / dt;
			const rawVx = (m.currentX - prevX) * frameScale;
			const rawVy = (m.currentY - prevY) * frameScale;
			const velAlpha = 1 - Math.exp(-dt * 18);
			m.vx += (rawVx - m.vx) * velAlpha;
			m.vy += (rawVy - m.vy) * velAlpha;

			const dynamics = computeCardDragDynamics({
				offsetX: m.currentX,
				offsetY: m.currentY,
				velocityX: m.vx,
				velocityY: m.vy,
				isOverDropZone: m.isOverZone,
				reducedMotion: metrics?.reducedMotion ?? false,
			});

			const scaleAlpha = 1 - Math.exp(-dt * 16);
			m.currentScale += (dynamics.targetScale - m.currentScale) * scaleAlpha;

			const cardEl = cardRef.current;
			if (cardEl) {
				cardEl.style.transform =
					`translate3d(${m.currentX.toFixed(2)}px, ${m.currentY.toFixed(2)}px, 0) ` +
					`perspective(900px) rotateX(${dynamics.tiltX.toFixed(2)}deg) rotateY(${dynamics.tiltY.toFixed(2)}deg) rotateZ(${dynamics.tiltZ.toFixed(2)}deg) ` +
					`scale(${m.currentScale.toFixed(4)})`;
			}

			const shadowEl = shadowRef.current;
			if (shadowEl) {
				shadowEl.style.transform =
					`translate3d(${dynamics.shadowX.toFixed(2)}px, ${dynamics.shadowY.toFixed(2)}px, 0) scale(${dynamics.shadowScale.toFixed(3)})`;
				shadowEl.style.opacity = dynamics.shadowOpacity.toFixed(3);
			}

			rafIdRef.current = window.requestAnimationFrame(tick);
		};

		rafIdRef.current = window.requestAnimationFrame(tick);
	}, [stopDragLoop]);

	const resetDrag = useCallback(() => {
		stopDragLoop();
		clearDropZoneIndicators();
		clearInlineDragStyles();
		pointerStartRef.current = null;
		dragStartedRef.current = false;
		metricsRef.current = null;
		motionRef.current.isOverZone = false;
		setIsPressed(false);
		setIsDragging(false);
		setIsOverDropZone(false);
	}, [stopDragLoop, clearDropZoneIndicators, clearInlineDragStyles]);

	const finishDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, wasCancelled: boolean) => {
		const pointerStart = pointerStartRef.current;
		if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			releasingCaptureRef.current = true;
			event.currentTarget.releasePointerCapture(event.pointerId);
			releasingCaptureRef.current = false;
		}

		const position = { x: event.clientX, y: event.clientY };
		const dropZoneRect = metricsRef.current?.dropZoneRect
			?? boardRef.current?.querySelector<HTMLElement>('[data-card-drop-zone="battlefield"]')?.getBoundingClientRect()
			?? null;
		const wasDropped = !wasCancelled
			&& dragStartedRef.current
			&& !!dropZoneRect
			&& isPointInBattleCommitZone(position, pointerStart, dropZoneRect);

		if (dragStartedRef.current) {
			suppressClickRef.current = true;
			onDragEnd?.(wasDropped, position);
			if (wasDropped) onValidDrop?.(position);
			window.setTimeout(() => { suppressClickRef.current = false; }, 0);
		}
		resetDrag();
	}, [boardRef, onDragEnd, onValidDrop, resetDrag]);

	const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		if (!isPlayable || !onValidDrop || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		pointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
		setIsPressed(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	}, [isPlayable, onValidDrop]);

	const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		const pointerStart = pointerStartRef.current;
		if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
		event.stopPropagation();
		const dx = event.clientX - pointerStart.x;
		const dy = event.clientY - pointerStart.y;

		if (!dragStartedRef.current && Math.hypot(dx, dy) >= DRAG_START_DISTANCE) {
			const metrics = captureDragMetrics();
			metricsRef.current = metrics;
			dragStartedRef.current = true;
			const initialOffset = toCanvasDragOffset({ x: dx, y: dy }, metrics.arenaScale);
			motionRef.current = {
				targetX: initialOffset.x,
				targetY: initialOffset.y,
				currentX: initialOffset.x,
				currentY: initialOffset.y,
				vx: 0,
				vy: 0,
				currentScale: isInHand ? 1.16 : 1.06,
				lastFrameTime: performance.now(),
				isOverZone: false,
			};
			setIsDragging(true);
			onDragStart?.();
			startDragLoop();
		}

		if (!dragStartedRef.current) return;
		event.preventDefault();

		const metrics = metricsRef.current;
		const arenaScale = metrics?.arenaScale ?? { x: 1, y: 1 };
		const offset = toCanvasDragOffset({ x: dx, y: dy }, arenaScale);
		motionRef.current.targetX = offset.x;
		motionRef.current.targetY = offset.y;

		const rect = metrics?.dropZoneRect ?? null;
		const nextOverZone = !!rect && isPointInBattleCommitZone(
			{ x: event.clientX, y: event.clientY },
			pointerStart,
			rect,
		);
		if (nextOverZone !== motionRef.current.isOverZone) {
			motionRef.current.isOverZone = nextOverZone;
			setIsOverDropZone(nextOverZone);
			document.documentElement.classList.toggle('is-card-drag-ready', nextOverZone);
			if (metrics?.dropZoneEl) {
				if (nextOverZone) metrics.dropZoneEl.setAttribute('data-drag-ready', 'true');
				else metrics.dropZoneEl.removeAttribute('data-drag-ready');
			}
		}
	}, [captureDragMetrics, isInHand, onDragStart, startDragLoop]);

	const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		event.stopPropagation();
		finishDrag(event, true);
	}, [finishDrag]);

	const handleLostPointerCapture = useCallback(() => {
		if (releasingCaptureRef.current) return;
		if (dragStartedRef.current) {
			onDragEnd?.(false, { x: 0, y: 0 });
		}
		resetDrag();
	}, [onDragEnd, resetDrag]);

	if (!card) {
		debug.error('CardWithDrag received null card data');
		return null;
	}

	const hasCardProperty = isCardInstanceWithCardData(card);
	const processedCard = getCardDataSafely(card);
	const simpleData = toSimpleCardData(processedCard);
	const magicCursor = resolveCardMagicCursor(simpleData?.keywords);
	const dragClassName = buildCardDragClassName({
		className,
		magicCursor,
		isPlayable,
		isHovering,
		isInHand,
		canDrag: Boolean(onValidDrop),
		isPressed,
		isDragging,
		isOverDropZone,
	});

	return (
		<div
			ref={cardRef}
			className={dragClassName}
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={event => {
				event.stopPropagation();
				finishDrag(event, false);
			}}
			onPointerCancel={handlePointerCancel}
			onLostPointerCapture={handleLostPointerCapture}
			onMouseEnter={() => {
				setIsHovering(true);
				if (isPlayable) playSound('card_hover');
			}}
			onMouseLeave={() => setIsHovering(false)}
			data-card-id={processedCard.id || (hasCardProperty ? card.card?.id : undefined)}
			data-is-in-hand={isInHand ? 'true' : 'false'}
			data-is-playable={isPlayable ? 'true' : 'false'}
			aria-grabbed={isDragging}
		>
			<div ref={shadowRef} className="card-drag-shadow" aria-hidden="true" />
			{simpleData && (
				<SimpleCardCompat
					card={simpleData}
					isPlayable={isPlayable}
					isHighlighted={isHovering}
					size="small"
					className="flat-card-container"
					attackBuff={attackBuff}
					healthBuff={healthBuff}
				/>
			)}
		</div>
	);
});

export default CardWithDrag;
