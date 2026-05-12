/**
 * RichTooltip — portal-rendered tooltip that escapes overflow:hidden ancestors.
 *
 * Built specifically for the PackTile, where the article needs `overflow-hidden`
 * to clip the rotating sigil/aura but the tooltip must float free above
 * everything else on the page.
 *
 * Behaviour:
 *   - Trigger: a button (focusable, keyboard a11y).
 *   - Reveal: hover OR focus-within on the trigger.
 *   - Placement: above the trigger by default; flips below if too close to top.
 *   - Position is recomputed on each open + on window resize/scroll.
 *   - Closes on Escape, blur, or pointer leave.
 *
 * Styling lives in `client/src/styles/ornaments.css` under `.rich-tooltip-*`.
 */

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface RichTooltipProps {
	label: string;
	children: React.ReactNode;
	width?: number;
}

export function RichTooltip({ label, children, width = 320 }: RichTooltipProps) {
	const id = useId();
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

	const compute = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const tooltipHeight = tooltipRef.current?.offsetHeight ?? 200;
		const margin = 12;
		const flipsBelow = rect.top - tooltipHeight - margin < 8;
		const top = flipsBelow ? rect.bottom + margin : rect.top - margin - tooltipHeight;
		const idealLeft = rect.left + rect.width / 2 - width / 2;
		const minLeft = 8;
		const maxLeft = window.innerWidth - width - 8;
		const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));
		setPosition({ top, left, placement: flipsBelow ? 'bottom' : 'top' });
	}, [width]);

	useLayoutEffect(() => {
		if (!open) return;
		compute();
	}, [open, compute]);

	useEffect(() => {
		if (!open) return;
		const onChange = () => compute();
		window.addEventListener('scroll', onChange, true);
		window.addEventListener('resize', onChange);
		return () => {
			window.removeEventListener('scroll', onChange, true);
			window.removeEventListener('resize', onChange);
		};
	}, [open, compute]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	const tooltipNode = open && position ? (
		<div
			ref={tooltipRef}
			id={id}
			role="tooltip"
			className={`rich-tooltip rich-tooltip--${position.placement}`}
			style={{ top: position.top, left: position.left, width }}
		>
			{children}
		</div>
	) : null;

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				aria-label={label}
				aria-describedby={open ? id : undefined}
				className="info-tooltip-trigger"
				onMouseEnter={() => setOpen(true)}
				onMouseLeave={() => setOpen(false)}
				onFocus={() => setOpen(true)}
				onBlur={() => setOpen(false)}
				onClick={() => setOpen(prev => !prev)}
			>
				<Info size={14} strokeWidth={2.2} aria-hidden="true" />
			</button>
			{tooltipNode && createPortal(tooltipNode, document.body)}
		</>
	);
}
