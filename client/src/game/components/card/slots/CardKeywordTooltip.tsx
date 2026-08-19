/**
 * <CardKeywordTooltip> — hover FAQ for keywords and card chrome.
 *
 * LoL HUD rule: dock beside the card, never follow the cursor, and never
 * lift the parent card while a mark is being inspected.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCardFrame } from '../CardFrameContext';
import { CARD_CHROME_FAQ_ATTR, getKeywordChromeFaq } from '../cardChromeFaq';
import { resolveChromeFaqDock } from '../cardChromeFaqDock';

export interface CardKeywordTooltipProps {
	keywords?: readonly string[];
}

interface TooltipState {
	left: number;
	top: number;
	text: string;
	side: string;
}

const FAQ_SELECTOR = `[${CARD_CHROME_FAQ_ATTR}], .card-frame__keyword-chip`;
const TOOLTIP_SIZE = { width: 240, height: 72 };

const readFaqText = (node: HTMLElement, keywordSet: Set<string>): string | null => {
	const marked = node.closest(`[${CARD_CHROME_FAQ_ATTR}]`) as HTMLElement | null;
	const markedText = marked?.getAttribute(CARD_CHROME_FAQ_ATTR);
	if (markedText && markedText.length > 0) return markedText;

	const chip = node.closest('.card-frame__keyword-chip') as HTMLElement | null;
	if (!chip) return null;
	const summary = chip.dataset.keywordSummary;
	if (summary !== undefined && summary.length > 0) return summary;
	const keyword = chip.dataset.keyword ?? '';
	if (keywordSet.size > 0 && !keywordSet.has(keyword)) return null;
	if (!keyword) return null;
	return getKeywordChromeFaq(keyword);
};

const findFaqNode = (node: HTMLElement): HTMLElement | null =>
	node.closest(FAQ_SELECTOR);

const CardKeywordTooltip: React.FC<CardKeywordTooltipProps> = ({ keywords }) => {
	const { rootRef, disableTooltips } = useCardFrame();
	const [tip, setTip] = useState<TooltipState | null>(null);
	const keywordSet = useRef<Set<string>>(new Set());

	useEffect(() => {
		keywordSet.current = new Set(keywords ?? []);
	}, [keywords]);

	const closeTip = useCallback(() => {
		rootRef.current?.removeAttribute('data-chrome-inspecting');
		setTip(null);
	}, [rootRef]);

	const onPointerOver = useCallback((e: PointerEvent) => {
		if (disableTooltips) return;
		const target = e.target as HTMLElement | null;
		const root = rootRef.current;
		if (!target || !root) return;
		const faqNode = findFaqNode(target);
		const text = readFaqText(target, keywordSet.current);
		if (!faqNode || !text) return;
		const dock = resolveChromeFaqDock({
			mark: faqNode.getBoundingClientRect(),
			card: root.getBoundingClientRect(),
			viewport: { width: window.innerWidth, height: window.innerHeight },
			tooltip: TOOLTIP_SIZE,
		});
		root.setAttribute('data-chrome-inspecting', 'true');
		setTip({ left: dock.left, top: dock.top, text, side: dock.side });
	}, [disableTooltips, rootRef]);

	const onPointerOut = useCallback((e: PointerEvent) => {
		const target = e.target as HTMLElement | null;
		const next = e.relatedTarget as HTMLElement | null;
		if (!target?.closest(FAQ_SELECTOR)) return;
		if (next?.closest(FAQ_SELECTOR)) return;
		closeTip();
	}, [closeTip]);

	useEffect(() => {
		if (disableTooltips) return;
		const root = rootRef.current;
		if (!root) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeTip();
		};
		root.addEventListener('pointerover', onPointerOver);
		root.addEventListener('pointerout', onPointerOut);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			root.removeEventListener('pointerover', onPointerOver);
			root.removeEventListener('pointerout', onPointerOut);
			window.removeEventListener('keydown', onKeyDown);
			root.removeAttribute('data-chrome-inspecting');
		};
	}, [rootRef, onPointerOver, onPointerOut, closeTip, disableTooltips]);

	if (tip === null || disableTooltips) return null;

	const tooltipNode = (
		<div
			className="card-keyword-tooltip"
			data-dock-side={tip.side}
			role="tooltip"
			style={{
				position: 'fixed',
				left: tip.left,
				top: tip.top,
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
