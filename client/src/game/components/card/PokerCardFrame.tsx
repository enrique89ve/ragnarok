/**
 * <PokerCardFrame> — poker-only card chrome.
 *
 * Lives outside the unified <CardFrame> pipeline on purpose. CardFrame
 * is built for NFT minion cards (pre-rendered PNG layer, rarity classes,
 * animated conic borders, holo handlers) and that chrome has no place
 * on a 52-card deck. Routing poker through it leaks bevel, gold facets,
 * and rarity animations onto cards that should look minimalist.
 *
 * What this component provides:
 *   - a single aspect-ratio box sized to poker proportions
 *   - a CardFrameContext stub so <CardRankSuit> can read `size` (it
 *     sets `data-size` on the art layer and uses that to scale
 *     corner runes + center symbol)
 *   - two clean visual variants: `face-up` (parchment) and
 *     `face-down` (solid #1a1d24 + Eihwaz rune, no border, no glow)
 *
 * What this component DOES NOT do (vs CardFrame):
 *   - no PNG chrome layer
 *   - no rarity classes / animated borders / element band
 *   - no holo tracking / parallax
 *   - no legibility dark gradient over the art
 *   - no `disablePng` render path — there is no PNG to disable
 *
 * Sizing: pass `size` (small/medium/large/preview) or override via
 * `width` / `height` for special zones (community board, hole cards).
 * The card stays 5:7 unless both overrides are set.
 */

import React, { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import {
	CardFrameContext,
	type CardFrameContextValue,
} from './CardFrameContext';
import { resolveCardDims } from './sizing';
import type { CardSize } from './types';
import './PokerCardFrame.css';

export interface PokerCardFrameProps {
	/** Size bucket — picks the resolved dimension from the sizing
	 *  table. Mirrors CardFrame so slots can read the same scale. */
	size?: CardSize;

	/** Force a specific width in px. Bypasses the sizing table. */
	width?: number;

	/** Force a specific height in px. Bypasses the sizing table. */
	height?: number;

	/** Visual variant.
	 *  `face-up`   — parchment + corner runes (Q, 5, A revealed).
	 *  `face-down` — solid dark + Eihwaz center rune, no border.
	 *  Default: `face-up`. */
	variant?: 'face-up' | 'face-down';

	/** Optional extra class on the root. */
	className?: string;

	/** Optional inline style on the root. */
	style?: CSSProperties;

	/** Slot children. Typically <CardRankSuit> or <CardCardBack>. */
	children?: ReactNode;
}

const PokerCardFrame: React.FC<PokerCardFrameProps> = ({
	size = 'medium',
	width,
	height,
	variant = 'face-up',
	className,
	style,
	children,
}) => {
	const rootRef = useRef<HTMLDivElement>(null);

	const dims = resolveCardDims({
		shape: 'poker',
		size,
		overrideWidth: width,
		overrideHeight: height,
	});

	const contextValue = useMemo<CardFrameContextValue>(
		() => ({
			rootRef,
			shape: 'poker',
			size,
			// rarity/element are part of the context contract but
			// unused inside the slot tree of a poker card. Defaults
			// keep useCardFrame() callers happy without affecting paint.
			rarity: 'common',
			element: 'neutral',
			dims,
			pngFailed: false,
			isPlayable: true,
			isHighlighted: false,
			statsMode: 'hidden',
			cardType: null,
			cardKind: null,
			cardFamily: 'poker',
			evolutionLevel: null,
			disableTooltips: false,
		}),
		[size, dims],
	);

	const rootClasses = [
		'poker-card-frame',
		`poker-card-frame--${variant}`,
		className,
	].filter(Boolean).join(' ');

	return (
		<CardFrameContext.Provider value={contextValue}>
			<div
				ref={rootRef}
				className={rootClasses}
				data-poker-size={size}
				data-poker-variant={variant}
				style={{
					width: dims.width,
					height: dims.height,
					...style,
				}}
			>
				{children}
			</div>
		</CardFrameContext.Provider>
	);
};

export default PokerCardFrame;
PokerCardFrame.displayName = 'PokerCardFrame';
