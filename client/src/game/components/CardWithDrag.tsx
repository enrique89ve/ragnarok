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
	isPointInsideDropRect,
	resolveCardMagicCursor,
	toCanvasDragOffset,
} from './cardDragDrop';
import type { CardMagicCursor } from './cardDragDrop';

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

const DRAG_START_DISTANCE = 4;

interface PointerStart {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
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
	const [isHovering, setIsHovering] = useState(false);
	const [isPressed, setIsPressed] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [isOverDropZone, setIsOverDropZone] = useState(false);
	const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
	const pointerStartRef = useRef<PointerStart | null>(null);
	const dragStartedRef = useRef(false);
	const releasingCaptureRef = useRef(false);
	const suppressClickRef = useRef(false);

	useEffect(() => {
		if (!isDragging) return undefined;
		document.documentElement.classList.add('is-card-dragging');
		return () => document.documentElement.classList.remove('is-card-dragging');
	}, [isDragging]);

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

	const getDropZoneRect = useCallback((): DOMRect | null => {
		const dropZone = boardRef.current?.querySelector<HTMLElement>('[data-card-drop-zone="battlefield"]');
		return dropZone?.getBoundingClientRect() ?? null;
	}, [boardRef]);

	const getArenaScale = useCallback((): Position => {
		const arena = boardRef.current;
		if (!arena) return { x: 1, y: 1 };
		const rect = arena.getBoundingClientRect();
		const scaleX = arena.offsetWidth > 0 ? rect.width / arena.offsetWidth : 1;
		const scaleY = arena.offsetHeight > 0 ? rect.height / arena.offsetHeight : 1;
		return {
			x: scaleX > 0 ? scaleX : 1,
			y: scaleY > 0 ? scaleY : 1,
		};
	}, [boardRef]);

	const resetDrag = useCallback(() => {
		pointerStartRef.current = null;
		dragStartedRef.current = false;
		setIsPressed(false);
		setIsDragging(false);
		setIsOverDropZone(false);
		setDragOffset({ x: 0, y: 0 });
	}, []);

	const finishDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, wasCancelled: boolean) => {
		const pointerStart = pointerStartRef.current;
		if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			releasingCaptureRef.current = true;
			event.currentTarget.releasePointerCapture(event.pointerId);
			releasingCaptureRef.current = false;
		}

		const position = { x: event.clientX, y: event.clientY };
		const dropZoneRect = getDropZoneRect();
		const wasDropped = !wasCancelled && dragStartedRef.current && !!dropZoneRect && isPointInsideDropRect(position, dropZoneRect);
		if (dragStartedRef.current) {
			suppressClickRef.current = true;
			onDragEnd?.(wasDropped, position);
			if (wasDropped) onValidDrop?.(position);
			window.setTimeout(() => { suppressClickRef.current = false; }, 0);
		}
		resetDrag();
	}, [getDropZoneRect, onDragEnd, onValidDrop, resetDrag]);

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
		const x = event.clientX - pointerStart.x;
		const y = event.clientY - pointerStart.y;
		if (!dragStartedRef.current && Math.hypot(x, y) >= DRAG_START_DISTANCE) {
			dragStartedRef.current = true;
			setIsDragging(true);
			onDragStart?.();
		}
		if (!dragStartedRef.current) return;
		event.preventDefault();
		const arenaScale = getArenaScale();
		setDragOffset(toCanvasDragOffset({ x, y }, arenaScale));
		const rect = getDropZoneRect();
		setIsOverDropZone(!!rect && isPointInsideDropRect({ x: event.clientX, y: event.clientY }, rect));
	}, [getArenaScale, getDropZoneRect, onDragStart]);

	const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
		event.stopPropagation();
		finishDrag(event, true);
	}, [finishDrag]);

	const handleLostPointerCapture = useCallback(() => {
		if (releasingCaptureRef.current) return;
		resetDrag();
	}, [resetDrag]);

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
			style={isDragging ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.06)` } : undefined}
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
