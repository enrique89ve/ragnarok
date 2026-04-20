/**
 * BossQuipBubble.tsx
 *
 * Transient in-character dialogue bubble that pops over the opponent
 * hero portrait during campaign combat. Driven by mission.bossQuips
 * (see campaignTypes.ts) and triggered from RagnarokCombatArena on
 * combat start, low HP, and lethal incoming.
 *
 * Visual style: parchment + tarnished gold border, mirrors the panel
 * material established in design-tokens.css. Auto-dismisses after
 * `duration` ms (defaults to 4500ms — long enough to read 1-2 lines,
 * short enough to not block gameplay).
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BossQuipBubble.css';

interface BossQuipBubbleProps {
	/** The line to display. Falsy / empty string hides the bubble. */
	text: string | null | undefined;
	/** Speaker's display name (rendered above the line, smaller). */
	speakerName?: string;
	/**
	 * Optional speaker portrait URL. When set, a small circular portrait
	 * renders to the left of the bubble, anchoring the dialogue to a
	 * face. Falls back to no portrait if absent. Use the boss hero art —
	 * we already resolve hero portraits via resolveHeroPortrait() at
	 * call sites, so this is just a path in the props.
	 */
	speakerPortrait?: string;
	/** Auto-dismiss duration in ms. Default 4500. */
	duration?: number;
	/**
	 * Bumped every time the parent wants to fire a NEW quip even if the
	 * text is the same. Without this, two consecutive identical quips
	 * (e.g. two combats in a row both opening with "I have foreseen
	 * this") wouldn't re-trigger because text didn't change.
	 */
	triggerKey?: number;
}

export const BossQuipBubble: React.FC<BossQuipBubbleProps> = ({
	text,
	speakerName,
	speakerPortrait,
	duration = 4500,
	triggerKey = 0,
}) => {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!text) {
			setVisible(false);
			return undefined;
		}
		setVisible(true);
		const t = setTimeout(() => setVisible(false), duration);
		return () => clearTimeout(t);
	}, [text, duration, triggerKey]);

	return (
		<AnimatePresence>
			{visible && text && (
				<motion.div
					key={`${text}-${triggerKey}`}
					initial={{ opacity: 0, y: -10, scale: 0.92 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -6, scale: 0.96 }}
					transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
					className={`boss-quip-bubble ${speakerPortrait ? 'with-portrait' : ''}`}
				>
					{speakerPortrait && (
						<img
							src={speakerPortrait}
							alt={speakerName ?? ''}
							className="boss-quip-portrait"
						/>
					)}
					<div className="boss-quip-content">
						{speakerName && (
							<div className="boss-quip-speaker">{speakerName}</div>
						)}
						<div className="boss-quip-text">{text}</div>
					</div>
					<div className="boss-quip-tail" />
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default BossQuipBubble;
