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

const CardFrame: React.FC<CardFrameProps> = ({
	shape = 'tile',
	rarity = 'common',
	element = 'neutral',
	size = 'medium',
	render = 'png',
	disablePng = false,
	onClick,
	overrideWidth,
	overrideHeight,
	children,
	className,
	style,
	interactive,
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
	};

	const classes = buildFrameClasses({
		shape,
		rarity,
		render: effectiveRender,
		holoTier,
		className,
	});

	const showPng = effectiveRender === 'png' && !pngFailed;
	const frameSrc = showPng ? framePathFor(rarity, element) : undefined;

	return (
		<CardFrameContext.Provider value={contextValue}>
			<div
				ref={rootRef}
				className={classes}
				data-rarity={rarity}
				data-element={element}
				data-render={effectiveRender}
				data-interactive={isInteractive ? 'true' : 'false'}
				data-holo-mask={holoTier ? 'art-window' : null}
				style={{
					'--cf-band-from': band.from,
					'--cf-band-to': band.to,
					'--cf-radius': `${dims.borderRadius}px`,
					width: dims.width,
					height: dims.height,
					aspectRatio: dims.aspectRatio,
					...style,
				} as React.CSSProperties}
				onClick={onClick}
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				{...rest}
			>
				<div className="card-frame__art-layer">
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
 * match by displayName. A future guard can enforce that.
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
		const t = c.type as { displayName?: string };
		if (t.displayName === 'CardArt' ||
			t.displayName === 'CardRankSuit' ||
			t.displayName === 'CardCardBack') {
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
		const t = c.type as { displayName?: string };
		if (t.displayName === 'CardArt' ||
			t.displayName === 'CardRankSuit' ||
			t.displayName === 'CardCardBack' ||
			c.type === CardHolo) return;
		rest.push(c);
	});
	return <>{rest}</>;
}

export default CardFrame;
export { CardFrame };

function buildFrameClasses(args: {
	shape: string;
	rarity: string;
	render: string;
	holoTier: string | null;
	className: string | undefined;
}): string {
	return [
		'card-frame',
		`card-frame--${args.shape}`,
		`card-frame--rarity-${args.rarity}`,
		`card-frame--render-${args.render}`,
		args.holoTier ? `holo-${args.holoTier}` : '',
		args.className ?? '',
	].filter(Boolean).join(' ');
}
