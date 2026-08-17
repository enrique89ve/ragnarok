/**
 * <PokerCardFrame> — compatibility wrapper for 52-card poker renders.
 *
 * The poker board keeps importing this focused component, but the visual
 * chrome is now owned by <CardFrame> + NorseCardFrame.css. That keeps
 * collection and poker frame changes on one shared skin while preserving
 * the rank/suit and face-down slot payloads.
 */

import React, { type CSSProperties, type ReactNode } from 'react';
import CardFrame from './CardFrame';
import { resolveCardDims } from './sizing';
import type { CardSize } from './types';
import './pokerFaceDown.css';
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
	const dims = resolveCardDims({
		shape: 'poker',
		size,
		overrideWidth: width,
		overrideHeight: height,
	});

	const rootClasses = [
		'norse-card-frame',
		'norse-card-frame--poker',
		'norse-card-frame--surface-poker',
		'poker-card-frame',
		`poker-card-frame--${variant}`,
		className,
	].filter(Boolean).join(' ');

	return (
		<CardFrame
			shape="poker"
			size={size}
			rarity="common"
			element="neutral"
			render="css"
			statsMode="hidden"
			cardFamily="poker"
			interactive={false}
			overrideWidth={dims.width}
			overrideHeight={dims.height}
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
		</CardFrame>
	);
};

export default PokerCardFrame;
PokerCardFrame.displayName = 'PokerCardFrame';
