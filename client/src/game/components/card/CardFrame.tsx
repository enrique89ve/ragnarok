/**
 * <CardFrame> — unified card chrome (commit (b) wiring).
 *
 * Renders the three-layer z-stack:
 *   z:0  <CardArt>                 (slot child)
 *   z:1  legibility dark gradient
 *   z:2  element tint band         (band-{from,to} CSS vars)
 *   z:3  static PNG frame          (skip when render='svg'/'css')
 *   z:4  rarity border             (::before, animated conic)
 *   z:5+ slot children render in tree order, each owns its z-index
 *   z:5/7  holo foil/glitter/glare  (only when <CardHolo> child present)
 *
 * Frame root owns:
 *   - ref (for parallax handlers)
 *   - rarity data attr + class
 *   - element data attr + band CSS vars
 *   - holo mouse handlers (cheap no-op when no <CardHolo> child)
 *   - PNG <img onError> tracking
 *   - context value for slot children
 *
 * Slot children are walked to detect <CardHolo> presence. Walking
 * once per render is fine — frames are bounded in count per page
 * (max ~30 in the collection grid).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Children, isValidElement } from 'react';
import { framePathFor } from '../../utils/art/frameArt';
import { getElementBand } from '../../utils/art/elementBand';
import { getHoloTier, applyHoloVars, resetHoloVars } from '../../hooks/useHoloTracking';
import type { CardFrameProps } from './types';
import { resolveCardDims } from './sizing';
import { CardFrameContext, type CardFrameContextValue } from './CardFrameContext';
import CardHolo from './slots/CardHolo';
import CardArt from './slots/CardArt';
import CardRankSuit from './slots/CardRankSuit';
import CardCardBack from './slots/CardCardBack';
import './CardFrame.css';
import './NorseCardFrame.css';
import './cardSurfaceContract.css';

const CardFrame: React.FC<CardFrameProps> = ({
	shape = 'tile',
	rarity = 'common',
	element = 'neutral',
	size = 'medium',
	render = 'png',
	frameAsset = 'minimal-war-table-v4',
	disablePng = false,
	onClick,
	overrideWidth,
	overrideHeight,
	children,
	className,
	style,
	interactive,
	isPlayable = true,
	isHighlighted = false,
	statsMode = 'frame',
	cardType = null,
	cardKind = null,
	cardFamily = null,
	evolutionLevel = null,
	disableTooltips = false,
	...rest
}) => {
	const dims = resolveCardDims({ shape, size, overrideWidth, overrideHeight });
	const effectiveRender = disablePng ? 'svg' : render;

	const rootRef = useRef<HTMLDivElement>(null);
	const [pngFailed, setPngFailed] = useState(false);
	const handlePngError = useCallback(() => setPngFailed(true), []);

	const hasHolo = useMemo(
		() => Children.toArray(children).some(
			(c) => isValidElement(c) && c.type === CardHolo,
		),
		[children],
	);

	const holoTier = hasHolo ? getHoloTier(rarity) : null;

	const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!holoTier || !rootRef.current) return;
		applyHoloVars(rootRef.current, e);
	}, [holoTier]);

	const onMouseLeave = useCallback(() => {
		if (!holoTier || !rootRef.current) return;
		resetHoloVars(rootRef.current);
	}, [holoTier]);

	const band = getElementBand(element);

	const isInteractive = interactive ?? (onClick !== undefined);

	const contextValue: CardFrameContextValue = {
		rootRef,
		shape,
		size,
		rarity,
		element,
		dims,
		pngFailed,
		isPlayable,
		isHighlighted,
		statsMode,
		cardType,
		cardKind,
		cardFamily,
		evolutionLevel,
		disableTooltips,
	};

	const classes = buildFrameClasses({
		shape,
		rarity,
		render: effectiveRender,
		frameAsset,
		holoTier,
		cardType,
		cardKind,
		cardFamily,
		evolutionLevel,
		isPlayable,
		isHighlighted,
		className,
	});

	const showPng = effectiveRender === 'png' && !pngFailed;
	const frameSrc = showPng ? framePathFor(rarity, element, frameAsset) : undefined;

	return (
		<CardFrameContext.Provider value={contextValue}>
			<div
				ref={rootRef}
				className={classes}
				data-rarity={rarity}
				data-element={element}
				data-render={effectiveRender}
				data-stats-mode={statsMode}
				data-card-type={cardType ?? undefined}
				data-card-kind={cardKind ?? undefined}
				data-card-family={cardFamily ?? undefined}
				data-evolution={evolutionLevel ?? undefined}
				data-playable={isPlayable ? 'true' : 'false'}
				data-highlighted={isHighlighted ? 'true' : 'false'}
				data-interactive={isInteractive ? 'true' : 'false'}
				data-holo-mask={holoTier ? 'art-window' : null}
				style={{
					'--cf-band-from': band.from,
					'--cf-band-to': band.to,
					'--cf-radius': `${dims.borderRadius}px`,
					// Fill the parent slot width (up to the resolved max) and let
					// `aspectRatio` derive the height. This way the card respects
					// the parent container's width — flex parents, grid cells,
					// hand slots — instead of forcing its own px dimensions and
					// overflowing them. `maxWidth` still caps standalone callers
					// (MulliganCard, MythicEntrance) that have no parent width.
					width: '100%',
					maxWidth: dims.width,
					...style,
					// `aspectRatio` is reapplied AFTER `...style` so a caller
					// passing arbitrary width/height (e.g. EnhancedCard's
					// `style={{ width: '100%', height: '100%' }}`) cannot
					// accidentally strip it — the frame's aspect is part of
					// the chrome contract.
					aspectRatio: dims.aspectRatio,
					// Final containment guards. CSS class already sets these,
					// but inline is defense-in-depth against any third-party
					// stylesheet that might override `.card-frame` to
					// `overflow: visible` (the historical bug — see commit).
					position: 'relative',
					overflow: 'hidden',
					maxHeight: '100%',
				} as React.CSSProperties}
				onClick={onClick}
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				{...rest}
			>
				<div
					className="card-frame__art-layer"
					// Inline containment is the chrome contract. The CSS class
					// already declares the same, but inline guarantees that no
					// descendant slot (CardArt img, CardRankSuit fill, etc.)
					// can ever escape the art rectangle — even if a future
					// stylesheet accidentally promotes `overflow: visible`.
					style={{
						position: 'absolute',
						inset: 0,
						width: '100%',
						height: '100%',
						overflow: 'hidden',
					}}
				>
					<CardArtFromChildren>{children}</CardArtFromChildren>
				</div>
				<div className="card-frame__legibility" />
				<div className="card-frame__band" />
				{showPng && frameSrc !== undefined && (
					<img
						className="card-frame__png"
						src={frameSrc}
						alt=""
						decoding="async"
						loading="lazy"
						onError={handlePngError}
					/>
				)}
				{holoTier && (
					<>
						<div className="holo-foil" aria-hidden="true" />
						<div className="holo-glitter" aria-hidden="true" />
						<div className="holo-glare" aria-hidden="true" />
					</>
				)}
				<NonArtChildren>{children}</NonArtChildren>
			</div>
		</CardFrameContext.Provider>
	);
};

/**
 * Walks children, extracts the single "art-layer" child (if any) and
 * renders it inside the art-layer at z:0. Renders null otherwise so
 * the layer collapses to zero height in the DOM.
 *
 * Art-layer slots are <CardArt>, <CardRankSuit>, <CardCardBack>. Only
 * one of these should be present per card; the walker picks the first
 * match. The walker matches by identity (`c.type === CardArt`) FIRST
 * (the cheap, unambiguous check) and falls back to the displayName
 * string for the imported-as-named-export case, which some bundlers
 * preserve and some rewrite. Belt + suspenders.
 *
 * Why extract: art-layer content must sit BEHIND legibility/band/PNG,
 * but other slots (mana gem, name plate) must sit IN FRONT. Children
 * as render tree doesn't give us ordering control, so the frame owns
 * the art-layer slot and the rest pass through.
 */
function CardArtFromChildren({ children }: { children: React.ReactNode }) {
	let art: React.ReactNode = null;
	Children.forEach(children, (c) => {
		if (!isValidElement(c)) return;
		if (isArtLayerSlot(c)) {
			if (art === null) art = c;
		}
	});
	return <>{art}</>;
}

/**
 * Renders every child EXCEPT the extracted art-layer slot and the
 * marker <CardHolo>. These render in tree order on top of the chrome
 * layers.
 */
function NonArtChildren({ children }: { children: React.ReactNode }) {
	const rest: React.ReactNode[] = [];
	Children.forEach(children, (c) => {
		if (!isValidElement(c)) return;
		if (isArtLayerSlot(c) || c.type === CardHolo) return;
		rest.push(c);
	});
	return <>{rest}</>;
}

/**
 * `true` when `child` is one of the art-layer slots: <CardArt>,
 * <CardRankSuit>, or <CardCardBack>. Identity check wins so the
 * walker is robust to bundler displayName rewrites; displayName
 * fallback handles the rare wrapped/forwardRef case.
 */
function isArtLayerSlot(child: React.ReactElement): boolean {
	if (child.type === CardArt ||
		child.type === CardRankSuit ||
		child.type === CardCardBack) {
		return true;
	}
	const t = child.type as { displayName?: string; name?: string };
	// `displayName` covers wrapped/forwardRef; `name` (function name)
	// is a final fallback for the rare case where a bundler strips
	// displayName but preserves the source function name. This keeps
	// the walker robust to HMR/dev-mode HOC wrapping.
	if (t.displayName === 'CardArt' ||
		t.displayName === 'CardRankSuit' ||
		t.displayName === 'CardCardBack') {
		return true;
	}
	return t.name === 'CardArt' ||
		t.name === 'CardRankSuit' ||
		t.name === 'CardCardBack';
}

export default CardFrame;
export { CardFrame };

function buildFrameClasses(args: {
	shape: string;
	rarity: string;
	render: string;
	frameAsset: string;
	holoTier: string | null;
	cardType: string | null;
	cardKind: string | null;
	cardFamily: string | null;
	evolutionLevel: number | null;
	isPlayable: boolean;
	isHighlighted: boolean;
	className: string | undefined;
}): string {
	return [
		'card-frame',
		`card-frame--${args.shape}`,
		`card-frame--rarity-${args.rarity}`,
		`card-frame--render-${args.render}`,
		`card-frame--asset-${args.frameAsset}`,
		args.cardType ? `card-frame--type-${args.cardType}` : '',
		args.cardKind ? `card-frame--kind-${args.cardKind}` : '',
		args.cardFamily ? `card-frame--family-${args.cardFamily}` : '',
		args.evolutionLevel ? `card-frame--evolution-${args.evolutionLevel}` : '',
		args.holoTier ? `holo-${args.holoTier}` : '',
		args.isPlayable ? '' : 'card-frame--unplayable',
		args.isHighlighted ? 'card-frame--highlighted' : '',
		args.className ?? '',
	].filter(Boolean).join(' ');
}
