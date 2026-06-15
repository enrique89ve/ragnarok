/**
 * <CardKeywordTooltip> — slot: hover portaled tooltip for keywords.
 *
 * Renders a hidden marker into the slot tree. Listens for mouseenter /
 * focus on the frame root (read from context) and portals a tooltip
 * to `document.body` at the cursor / focus point. Closes on leave,
 * blur, Escape, or scroll.
 *
 * Disabled by `disableTooltips` (set by discovery modal which already
 * has its own portal). No-ops when `keywords` is empty.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCardFrame } from '../CardFrameContext';
import { getCardKeywordTooltipText } from '../cardKeywordDisplay';

export interface CardKeywordTooltipProps {
	keywords?: readonly string[];
}

interface TooltipState {
	x: number;
	y: number;
	text: string;
}

const TOOLTIP_OFFSET = 12;

const CardKeywordTooltip: React.FC<CardKeywordTooltipProps> = ({ keywords }) => {
	const { rootRef, disableTooltips } = useCardFrame();
	const [tip, setTip] = useState<TooltipState | null>(null);
	const keywordSet = useRef<Set<string>>(new Set());

	useEffect(() => {
		keywordSet.current = new Set(keywords ?? []);
	}, [keywords]);

	const onPointerOver = useCallback((e: PointerEvent) => {
		if (disableTooltips) return;
		const target = e.target as HTMLElement | null;
		if (!target) return;
		const chip = target.closest('.card-frame__keyword-chip') as HTMLElement | null;
		if (!chip) return;
		const summary = chip.dataset.keywordSummary;
		if (summary !== undefined && summary.length > 0) {
			setTip({ x: e.clientX, y: e.clientY, text: summary });
			return;
		}
		const keyword = chip.dataset.keyword ?? '';
		if (!keywordSet.current.has(keyword)) return;
		setTip({ x: e.clientX, y: e.clientY, text: getCardKeywordTooltipText(keyword) });
	}, [disableTooltips]);

	const onPointerOut = useCallback((e: Event) => {
		const target = e.target as HTMLElement | null;
		if (!target) return;
		const chip = target.closest('.card-frame__keyword-chip') as HTMLElement | null;
		if (!chip) return;
		setTip(null);
	}, []);

	useEffect(() => {
		if (disableTooltips) return;
		const root = rootRef.current;
		if (!root) return;
		root.addEventListener('pointerover', onPointerOver);
		root.addEventListener('pointerout', onPointerOut);
		return () => {
			root.removeEventListener('pointerover', onPointerOver);
			root.removeEventListener('pointerout', onPointerOut);
		};
	}, [rootRef, onPointerOver, onPointerOut, disableTooltips]);

	if (tip === null || disableTooltips) return null;

	const tooltipNode = (
		<div
			className="card-keyword-tooltip"
			style={{
				position: 'fixed',
				left: tip.x + TOOLTIP_OFFSET,
				top: tip.y + TOOLTIP_OFFSET,
				zIndex: 'var(--z-tooltip, 50)',
				pointerEvents: 'none',
			}}
		>
			{tip.text}
		</div>
	);

	return typeof document !== 'undefined' ? createPortal(tooltipNode, document.body) : null;
};

(CardKeywordTooltip as React.FC & { displayName?: string }).displayName = 'CardKeywordTooltip';

export default CardKeywordTooltip;
