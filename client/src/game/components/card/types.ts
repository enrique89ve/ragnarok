/**
 * <CardFrame> — shared types.
 *
 * Visual unification surface for every card-shaped render in the game:
 * Collection grid, DeckBuilder pool, HandFan, SimpleBattlefield,
 * HeroDetailPopup. Poker (`PlayingCard`) is intentionally excluded —
 * it has no rarity field and lives on the PvP wire protocol.
 *
 * The component itself is in `./CardFrame.tsx`. Slot children land in
 * `./slots/` during commit (b). This file is the single source of
 * truth for the public prop surface.
 */

import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../types/NorseTypes';
import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';

/**
 * Visual archetype. Drives aspect ratio + slot anchor positions.
 *
 * `portrait` — Collection modal, ~380 wide preview (3:4).
 * `tile`     — Collection grid + DeckBuilder pool (3:4, fluid width).
 * `row`      — Cheap CSS-only variant for sidebars (skip PNG layer).
 * `hand`     — HandFan card (5:7).
 * `board`    — SimpleBattlefield card (5:7).
 * `hero`     — HeroDetailPopup flip card (5:7).
 * `poker`    — DEFERRED. Listed for forward-doc only.
 */
export type CardShape =
	| 'portrait'
	| 'tile'
	| 'row'
	| 'hand'
	| 'board'
	| 'hero'
	| 'poker';

export type CardSize = 'small' | 'medium' | 'large' | 'preview';

/** Holo mask shape — `art-window` crops to the inner art rect,
 *  `full` covers the whole card (matches deckbuilder's existing override). */
export type HoloMask = 'art-window' | 'full';

/** Render technology.
 *  `png` — static baked frame (default, fallback to svg on 404).
 *  `svg` — pure vector chrome (cheaper, no network).
 *  `css` — CSS-only border + band, no SVG, no PNG. Used by `row`. */
export type CardFrameRender = 'png' | 'svg' | 'css';

/** Resolved pixel dimensions used by sizing logic and consumers
 *  that need to size siblings (e.g. mastery badge offsets). */
export interface ResolvedCardDims {
	width: number;
	height: number;
	aspectRatio: string;
}

export interface CardFrameProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick'> {
	/** Visual archetype. Default: 'tile'. */
	shape?: CardShape;

	/** Rarity — drives stroke, animated ::before border, holo tier. */
	rarity: Rarity;

	/** Element — drives the bottom tinted band. */
	element: NorseElement;

	/** Size bucket — picks the resolved dimension from the sizing table. */
	size?: CardSize;

	/** Render technology. Default: 'png'. Falls back to 'svg' on PNG 404. */
	render?: CardFrameRender;

	/** Skip the PNG layer entirely (forces svg/css). Equivalent to
	 *  `render: 'svg'`; keeps caller intent obvious for `row` variants. */
	disablePng?: boolean;

	/** Click handler. Passed to root <div>. */
	onClick?: (e: MouseEvent<HTMLDivElement>) => void;

	/** Force dimensions in px, bypassing the sizing table.
	 *  Both must be set together. */
	overrideWidth?: number;
	overrideHeight?: number;

	/** Slot children. Detected by element type, not name string.
	 *  Unknown children are placed at the top of the z-stack so future
	 *  slots can be added without touching the frame. */
	children?: ReactNode;
}
